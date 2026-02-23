import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { POST as postOffer } from "../api/v1/offers/route";
import { POST as postIntake } from "../api/v1/intake/route";
import { POST as postCreateDeal } from "../api/v1/admin/deals/route";
import { PATCH as patchDeal } from "../api/v1/admin/deals/[id]/route";
import { GET as getLedger, POST as postLedgerApprove } from "../api/v1/admin/ledger/route";
import { POST as postCheckout } from "../api/v1/admin/deals/[id]/checkout/route";
import { POST as postRefund } from "../api/v1/admin/deals/[id]/refund/route";
import { POST as postStripeWebhook } from "../api/v1/webhooks/stripe/route";

import {
  cleanupStandardE2EFixtures,
  setupStandardE2EFixture,
  type StandardE2EFixture,
} from "./helpers/e2e-fixtures";

vi.mock("@/adapters/stripe/stripe-client", async () => {
  return {
    createCheckoutSession: vi.fn(async () => ({
      id: "cs_test_ledger",
      url: "https://stripe.example/checkout/cs_test_ledger",
      payment_intent: "pi_test_ledger",
      metadata: null,
    })),
    createRefund: vi.fn(async () => ({ id: "re_test_ledger", status: "succeeded" })),
    constructWebhookEvent: vi.fn((input: { payload: string; signature: string }) => {
      const parsed = JSON.parse(input.payload) as { id: string; type: string; data: { object: unknown } };
      return parsed;
    }),
  };
});

let fixture: StandardE2EFixture;

const requireResponse = (response: Response | undefined): Response => {
  if (!response) {
    throw new Error("Expected route handler to return a Response");
  }
  return response;
};

describe("e2e ledger earned + approve + refund void", () => {
  beforeEach(async () => {
    fixture = await setupStandardE2EFixture();
    process.env.APPCTL_ENV = "local";
    process.env.STRIPE_SECRET_KEY = "sk_test_dummy";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_dummy";
  });

  afterEach(async () => {
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_WEBHOOK_SECRET;
    await cleanupStandardE2EFixtures();
  });

  it("earns ledger entries on DELIVERED, requires confirm to approve, and voids on REFUNDED", async () => {
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

    const intakeResponse = await postIntake(
      new Request("http://localhost:3000/api/v1/intake", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({
          offer_slug: "advisory",
          audience: "INDIVIDUAL",
          contact_name: "Lead",
          contact_email: "lead@example.com",
          goals: "Need help",
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
          body: JSON.stringify({ intake_id: intakeBody.id, requested_provider_user_id: fixture.userId }),
        }),
      ),
    );

    expect(createDealResponse.status).toBe(201);
    const dealBody = (await createDealResponse.json()) as { id: string };

    // Assign provider + maestro.
    const assignResponse = requireResponse(
      await patchDeal(
        new Request(`http://localhost:3000/api/v1/admin/deals/${dealBody.id}`, {
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
        { params: Promise.resolve({ id: dealBody.id }) },
      ),
    );

    expect(assignResponse.status).toBe(200);

    const approveResponse = requireResponse(
      await patchDeal(
        new Request(`http://localhost:3000/api/v1/admin/deals/${dealBody.id}`, {
          method: "PATCH",
          headers: {
            "content-type": "application/json",
            origin: "http://localhost:3000",
            cookie: fixture.adminCookie,
          },
          body: JSON.stringify({ action: "approve" }),
        }),
        { params: Promise.resolve({ id: dealBody.id }) },
      ),
    );

    expect(approveResponse.status).toBe(200);

    // Create checkout.
    const checkoutResponse = await postCheckout(
      new Request(`http://localhost:3000/api/v1/admin/deals/${dealBody.id}/checkout`, {
        method: "POST",
        headers: {
          origin: "http://localhost:3000",
          cookie: fixture.adminCookie,
        },
      }),
      { params: Promise.resolve({ id: dealBody.id }) },
    );

    expect(checkoutResponse.status).toBe(201);
    const checkoutBody = (await checkoutResponse.json()) as { payment: { id: string } };

    // Webhook -> PAID.
    const stripeEventPayload = JSON.stringify({
      id: "evt_test_ledger_paid",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_test_ledger",
          payment_intent: "pi_test_ledger",
          metadata: {
            deal_id: dealBody.id,
            payment_id: checkoutBody.payment.id,
          },
        },
      },
    });

    const webhookResponse = await postStripeWebhook(
      new Request("http://localhost:3000/api/v1/webhooks/stripe", {
        method: "POST",
        headers: {
          "stripe-signature": "t=0,v1=dummy",
        },
        body: stripeEventPayload,
      }),
    );

    expect(webhookResponse.status).toBe(200);

    // Deliver the deal -> earns ledger.
    const deliverResponse = requireResponse(
      await patchDeal(
        new Request(`http://localhost:3000/api/v1/admin/deals/${dealBody.id}`, {
          method: "PATCH",
          headers: {
            "content-type": "application/json",
            origin: "http://localhost:3000",
            cookie: fixture.adminCookie,
          },
          body: JSON.stringify({ action: "status", status: "DELIVERED" }),
        }),
        { params: Promise.resolve({ id: dealBody.id }) },
      ),
    );

    expect(deliverResponse.status).toBe(200);

    const ledgerEarned = requireResponse(
      await getLedger(
        new Request("http://localhost:3000/api/v1/admin/ledger?status=EARNED", {
          headers: { cookie: fixture.adminCookie },
        }),
      ),
    );

    expect(ledgerEarned.status).toBe(200);
    const earnedBody = (await ledgerEarned.json()) as { items: { id: string; status: string; deal_id: string }[] };
    const dealEntries = earnedBody.items.filter((row) => row.deal_id === dealBody.id);
    expect(dealEntries.length).toBeGreaterThan(0);

    const approveWithoutConfirm = requireResponse(
      await postLedgerApprove(
        new Request("http://localhost:3000/api/v1/admin/ledger", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            origin: "http://localhost:3000",
            cookie: fixture.adminCookie,
          },
          body: JSON.stringify({ entry_ids: dealEntries.map((row) => row.id), confirm: false }),
        }),
      ),
    );

    expect(approveWithoutConfirm.status).toBe(412);

    const approveWithConfirm = requireResponse(
      await postLedgerApprove(
        new Request("http://localhost:3000/api/v1/admin/ledger", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            origin: "http://localhost:3000",
            cookie: fixture.adminCookie,
          },
          body: JSON.stringify({ entry_ids: dealEntries.map((row) => row.id), confirm: true }),
        }),
      ),
    );

    expect(approveWithConfirm.status).toBe(200);

    // Refund -> REFUNDED, void APPROVED/EARNED.
    const refundResponse = await postRefund(
      new Request(`http://localhost:3000/api/v1/admin/deals/${dealBody.id}/refund`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
          cookie: fixture.adminCookie,
        },
        body: JSON.stringify({ reason: "Client requested", confirm: true }),
      }),
      { params: Promise.resolve({ id: dealBody.id }) },
    );

    expect(refundResponse.status).toBe(200);

    const ledgerVoided = requireResponse(
      await getLedger(
        new Request("http://localhost:3000/api/v1/admin/ledger?status=VOID", {
          headers: { cookie: fixture.adminCookie },
        }),
      ),
    );

    expect(ledgerVoided.status).toBe(200);
    const voidedBody = (await ledgerVoided.json()) as { items: { deal_id: string }[] };
    expect(voidedBody.items.some((row) => row.deal_id === dealBody.id)).toBe(true);
  });
});
