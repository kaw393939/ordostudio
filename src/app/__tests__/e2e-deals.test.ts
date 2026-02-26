import { afterEach, beforeEach, describe, expect, it } from "vitest";
import Database from "better-sqlite3";

import { POST as postIntake } from "../api/v1/intake/route";
import { POST as postCreateDeal } from "../api/v1/admin/deals/route";
import { PATCH as patchDeal } from "../api/v1/admin/deals/[id]/route";
import { GET as getReferral } from "../api/v1/account/referral/route";
import { POST as postOffer } from "../api/v1/offers/route";

import {
  cleanupStandardE2EFixtures,
  setupStandardE2EFixture,
  type StandardE2EFixture,
} from "./helpers/e2e-fixtures";

let fixture: StandardE2EFixture;

const requireResponse = (response: Response | undefined): Response => {
  if (!response) {
    throw new Error("Expected route handler to return a Response");
  }
  return response;
};

describe("e2e deals queue + maestro gates", () => {
  beforeEach(async () => {
    fixture = await setupStandardE2EFixture();
    process.env.APPCTL_ENV = "local";
  });

  afterEach(async () => {
    await cleanupStandardE2EFixtures();
  });

  it("creates a deal from intake, records referrer, assigns + approves, and blocks IN_PROGRESS until PAID", async () => {
    const offerResponse = await postOffer(
      new Request("http://localhost:3000/api/v1/offers", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
          cookie: fixture.adminCookie,
        },
        body: JSON.stringify({
          slug: "advisory",
          title: "Advisory",
          summary: "Advisory consult",
          price_cents: 25000,
          currency: "USD",
          duration_label: "60 minutes",
          refund_policy_key: "standard",
          audience: "INDIVIDUAL",
          delivery_mode: "ONLINE",
          booking_url: "https://example.com/book/advisory",
          outcomes: ["Plan"],
          status: "ACTIVE",
        }),
      }),
    );

    expect(offerResponse.status).toBe(201);

    const referralResponse = requireResponse(
      await getReferral(
        new Request("http://localhost:3000/api/v1/account/referral", {
          headers: {
            cookie: fixture.userCookie,
          },
        }),
      ),
    );

    expect(referralResponse.status).toBe(200);
    const referralBody = (await referralResponse.json()) as { code: string; user_id: string };

    const intakeResponse = await postIntake(
      new Request("http://localhost:3000/api/v1/intake", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
          cookie: `so_ref=${referralBody.code}`,
        },
        body: JSON.stringify({
          offer_slug: "advisory",
          audience: "INDIVIDUAL",
          contact_name: "Lead",
          contact_email: "lead@example.com",
          goals: "Need help with AI delivery guardrails",
        }),
      }),
    );

    expect(intakeResponse.status).toBe(201);
    const intakeBody = (await intakeResponse.json()) as { id: string };

    const createDealResponse = requireResponse(
      await postCreateDeal(
        new Request("http://localhost:3000/api/v1/admin/deals", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            origin: "http://localhost:3000",
            cookie: fixture.adminCookie,
          },
          body: JSON.stringify({ intake_id: intakeBody.id }),
        }),
      ),
    );

    const createDealText = await createDealResponse.text();
    expect(createDealResponse.status, createDealText).toBe(201);
    const createdDeal = JSON.parse(createDealText) as { id: string; referrer_user_id: string | null; status: string };
    expect(createdDeal.status).toBe("QUEUED");
    expect(createdDeal.referrer_user_id).toBe(fixture.userId);

    const assignResponse = requireResponse(
      await patchDeal(
        new Request(`http://localhost:3000/api/v1/admin/deals/${createdDeal.id}`, {
          method: "PATCH",
          headers: {
            "content-type": "application/json",
            origin: "http://localhost:3000",
            cookie: fixture.adminCookie,
          },
          body: JSON.stringify({
            action: "assign",
            provider_user_id: fixture.userId,
            maestro_user_id: fixture.adminId,
            note: "Assigned for test",
          }),
        }),
        { params: Promise.resolve({ id: createdDeal.id }) },
      ),
    );

    expect(assignResponse.status).toBe(200);
    const assigned = (await assignResponse.json()) as { status: string; provider_user_id: string; maestro_user_id: string };
    expect(assigned.status).toBe("ASSIGNED");
    expect(assigned.provider_user_id).toBe(fixture.userId);
    expect(assigned.maestro_user_id).toBe(fixture.adminId);

    const approveResponse = requireResponse(
      await patchDeal(
        new Request(`http://localhost:3000/api/v1/admin/deals/${createdDeal.id}`, {
          method: "PATCH",
          headers: {
            "content-type": "application/json",
            origin: "http://localhost:3000",
            cookie: fixture.adminCookie,
          },
          body: JSON.stringify({ action: "approve" }),
        }),
        { params: Promise.resolve({ id: createdDeal.id }) },
      ),
    );

    expect(approveResponse.status).toBe(200);
    const approved = (await approveResponse.json()) as { status: string };
    expect(approved.status).toBe("MAESTRO_APPROVED");

    // Attempt to start work without payment.
    const startWithoutPaid = requireResponse(
      await patchDeal(
        new Request(`http://localhost:3000/api/v1/admin/deals/${createdDeal.id}`, {
          method: "PATCH",
          headers: {
            "content-type": "application/json",
            origin: "http://localhost:3000",
            cookie: fixture.adminCookie,
          },
          body: JSON.stringify({ action: "status", status: "IN_PROGRESS" }),
        }),
        { params: Promise.resolve({ id: createdDeal.id }) },
      ),
    );

    expect(startWithoutPaid.status).toBe(412);
  });

  it("assignDealAdmin rejects transition from DELIVERED → ASSIGNED (state machine guard)", async () => {
    // Create offer
    await postOffer(
      new Request("http://localhost:3000/api/v1/offers", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
          cookie: fixture.adminCookie,
        },
        body: JSON.stringify({
          slug: "advisory-sm",
          title: "Advisory SM",
          summary: "Advisory consult",
          price_cents: 25000,
          currency: "USD",
          duration_label: "60 minutes",
          refund_policy_key: "standard",
          audience: "INDIVIDUAL",
          delivery_mode: "ONLINE",
          booking_url: "https://example.com/book/advisory-sm",
          outcomes: ["Plan"],
          status: "ACTIVE",
        }),
      }),
    );

    // Create intake
    const intakeRes = await postIntake(
      new Request("http://localhost:3000/api/v1/intake", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({
          offer_slug: "advisory-sm",
          audience: "INDIVIDUAL",
          contact_name: "SM Lead",
          contact_email: "sm-lead@example.com",
          goals: "State machine test",
        }),
      }),
    );
    expect(intakeRes.status).toBe(201);
    const { id: intakeId } = (await intakeRes.json()) as { id: string };

    // Create deal
    const dealRes = requireResponse(
      await postCreateDeal(
        new Request("http://localhost:3000/api/v1/admin/deals", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            origin: "http://localhost:3000",
            cookie: fixture.adminCookie,
          },
          body: JSON.stringify({ intake_id: intakeId }),
        }),
      ),
    );
    expect(dealRes.status).toBe(201);
    const { id: dealId } = (await dealRes.json()) as { id: string };

    // Advance to ASSIGNED
    const assignRes = requireResponse(
      await patchDeal(
        new Request(`http://localhost:3000/api/v1/admin/deals/${dealId}`, {
          method: "PATCH",
          headers: {
            "content-type": "application/json",
            origin: "http://localhost:3000",
            cookie: fixture.adminCookie,
          },
          body: JSON.stringify({
            action: "assign",
            provider_user_id: fixture.userId,
            maestro_user_id: fixture.adminId,
          }),
        }),
        { params: Promise.resolve({ id: dealId }) },
      ),
    );
    expect(assignRes.status).toBe(200);

    // Force deal to DELIVERED via direct DB manipulation (bypasses payment gates
    // that require a real Stripe webhook in integration tests).
    const db = new Database(fixture.dbPath);
    db.prepare("UPDATE deals SET status = 'DELIVERED', updated_at = ? WHERE id = ?").run(
      new Date().toISOString(),
      dealId,
    );
    db.close();

    // Now attempt to reassign — must be rejected with 422
    const badAssign = requireResponse(
      await patchDeal(
        new Request(`http://localhost:3000/api/v1/admin/deals/${dealId}`, {
          method: "PATCH",
          headers: {
            "content-type": "application/json",
            origin: "http://localhost:3000",
            cookie: fixture.adminCookie,
          },
          body: JSON.stringify({
            action: "assign",
            provider_user_id: fixture.userId,
            maestro_user_id: fixture.adminId,
          }),
        }),
        { params: Promise.resolve({ id: dealId }) },
      ),
    );

    expect(badAssign.status).toBe(422);
  });

  it("createDealFromIntake returns 409 DealConflictError when same intake submitted twice", async () => {
    await postOffer(
      new Request("http://localhost:3000/api/v1/offers", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
          cookie: fixture.adminCookie,
        },
        body: JSON.stringify({
          slug: "advisory-dup",
          title: "Advisory Dup",
          summary: "Advisory consult",
          price_cents: 25000,
          currency: "USD",
          duration_label: "60 minutes",
          refund_policy_key: "standard",
          audience: "INDIVIDUAL",
          delivery_mode: "ONLINE",
          booking_url: "https://example.com/book/advisory-dup",
          outcomes: ["Plan"],
          status: "ACTIVE",
        }),
      }),
    );

    const intakeRes = await postIntake(
      new Request("http://localhost:3000/api/v1/intake", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({
          offer_slug: "advisory-dup",
          audience: "INDIVIDUAL",
          contact_name: "Dup Lead",
          contact_email: "dup-lead@example.com",
          goals: "Duplicate test",
        }),
      }),
    );
    expect(intakeRes.status).toBe(201);
    const { id: intakeId } = (await intakeRes.json()) as { id: string };

    // First creation — should succeed
    const first = requireResponse(
      await postCreateDeal(
        new Request("http://localhost:3000/api/v1/admin/deals", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            origin: "http://localhost:3000",
            cookie: fixture.adminCookie,
          },
          body: JSON.stringify({ intake_id: intakeId }),
        }),
      ),
    );
    expect(first.status).toBe(201);

    // Second creation with same intake_id — must return 409, not 500
    const second = requireResponse(
      await postCreateDeal(
        new Request("http://localhost:3000/api/v1/admin/deals", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            origin: "http://localhost:3000",
            cookie: fixture.adminCookie,
          },
          body: JSON.stringify({ intake_id: intakeId }),
        }),
      ),
    );
    expect(second.status).toBe(409);
  });
});
