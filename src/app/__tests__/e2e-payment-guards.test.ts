/**
 * PAY-01: Payment guard invariants
 *
 * Verifies:
 * 1. A second checkout call for a deal already in CREATED state returns 409.
 * 2. `refundDealPaymentAdmin` on a CREATED (never-paid) record returns 412
 *    PaymentPreconditionError("payment_not_paid") before Stripe is called.
 *
 * Uses the full e2e fixture so the migration 043 UNIQUE index is exercised.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/adapters/stripe/stripe-client", () => ({
  createCheckoutSession: vi.fn(async () => ({
    id: "cs_guard_test",
    url: "https://stripe.test/checkout/cs_guard_test",
    payment_intent: "pi_guard_test",
    metadata: null,
  })),
  createRefund: vi.fn(async () => ({ id: "re_guard_test", status: "succeeded" })),
  constructWebhookEvent: vi.fn(({ payload }: { payload: string }) => {
    const parsed = JSON.parse(payload) as {
      id: string;
      type: string;
      data: { object: unknown };
    };
    return { id: parsed.id, type: parsed.type, data: { object: parsed.data.object } };
  }),
}));

import { POST as postOffer } from "../api/v1/offers/route";
import { POST as postIntake } from "../api/v1/intake/route";
import { POST as postCreateDeal } from "../api/v1/admin/deals/route";
import { POST as postCheckout } from "../api/v1/admin/deals/[id]/checkout/route";
import { POST as postRefund } from "../api/v1/admin/deals/[id]/refund/route";

import { createStripeCheckoutForDeal, PaymentConflictError } from "@/lib/api/payments";

import {
  cleanupStandardE2EFixtures,
  setupStandardE2EFixture,
  type StandardE2EFixture,
} from "./helpers/e2e-fixtures";

let fixture: StandardE2EFixture;

const requireResponse = (r: Response | undefined): Response => {
  if (!r) throw new Error("Route handler returned undefined");
  return r;
};

const setupDealWithCreatedCheckout = async (fixture: StandardE2EFixture) => {
  const offerRes = await postOffer(
    new Request("http://localhost:3000/api/v1/offers", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "http://localhost:3000",
        cookie: fixture.adminCookie,
      },
      body: JSON.stringify({
        slug: "test-advisory",
        title: "Test Advisory",
        summary: "Audit guard test",
        price_cents: 10000,
        currency: "USD",
        duration_label: "30 min",
        refund_policy_key: "standard",
        audience: "INDIVIDUAL",
        delivery_mode: "ONLINE",
        booking_url: "https://example.com/book",
        outcomes: ["Insight"],
        status: "ACTIVE",
      }),
    }),
  );
  expect(offerRes.status).toBe(201);

  const intakeRes = await postIntake(
    new Request("http://localhost:3000/api/v1/intake", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "http://localhost:3000",
      },
      body: JSON.stringify({
        offer_slug: "test-advisory",
        audience: "INDIVIDUAL",
        contact_name: "Guard Test Lead",
        contact_email: "guard@example.com",
        goals: "Testing payment guards",
      }),
    }),
  );
  expect(intakeRes.status).toBe(201);
  const intakeBody = (await intakeRes.json()) as { id: string };

  const dealRes = requireResponse(
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
  expect(dealRes.status).toBe(201);
  const deal = (await dealRes.json()) as { id: string };

  // First checkout — should succeed and create a CREATED record
  const checkoutRes = requireResponse(
    await postCheckout(
      new Request(`http://localhost:3000/api/v1/admin/deals/${deal.id}/checkout`, {
        method: "POST",
        headers: {
          origin: "http://localhost:3000",
          cookie: fixture.adminCookie,
        },
      }),
      { params: Promise.resolve({ id: deal.id }) },
    ),
  );
  expect(checkoutRes.status).toBe(201);

  return { dealId: deal.id };
};

describe("PAY-01 — payment guard invariants", () => {
  beforeEach(async () => {
    fixture = await setupStandardE2EFixture();
    process.env.APPCTL_ENV = "local";
    process.env.STRIPE_SECRET_KEY = "sk_test_guard";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_guard";
  });

  afterEach(async () => {
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_WEBHOOK_SECRET;
    await cleanupStandardE2EFixtures();
  });

  it("second checkout call on CREATED deal returns 409 checkout_in_progress", async () => {
    const { dealId } = await setupDealWithCreatedCheckout(fixture);

    // Second checkout — same deal, still in CREATED state → conflict
    const secondCheckout = requireResponse(
      await postCheckout(
        new Request(`http://localhost:3000/api/v1/admin/deals/${dealId}/checkout`, {
          method: "POST",
          headers: {
            origin: "http://localhost:3000",
            cookie: fixture.adminCookie,
          },
        }),
        { params: Promise.resolve({ id: dealId }) },
      ),
    );

    expect(secondCheckout.status).toBe(409);
    const body = (await secondCheckout.json()) as { status: number };
    expect(body.status).toBe(409);
  });

  it("refund of a CREATED (unpaid) payment returns 412 payment_not_paid", async () => {
    const { dealId } = await setupDealWithCreatedCheckout(fixture);

    // Attempt refund — payment is CREATED (checkout started, never paid)
    const refundRes = requireResponse(
      await postRefund(
        new Request(`http://localhost:3000/api/v1/admin/deals/${dealId}/refund`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            origin: "http://localhost:3000",
            cookie: fixture.adminCookie,
          },
          body: JSON.stringify({ reason: "Test guard", confirm: true }),
        }),
        { params: Promise.resolve({ id: dealId }) },
      ),
    );

    // 412 Precondition Failed — payment is not in PAID state
    expect(refundRes.status).toBe(412);

    // Stripe createRefund must never have been called
    const stripeClient = await import("@/adapters/stripe/stripe-client");
    expect(stripeClient.createRefund).not.toHaveBeenCalled();
  });

  it("createStripeCheckoutForDeal throws PaymentConflictError for existing CREATED payment directly", async () => {
    const { dealId } = await setupDealWithCreatedCheckout(fixture);

    // Call the domain function directly to verify error type
    await expect(
      createStripeCheckoutForDeal({
        dealId,
        actorId: fixture.adminId,
        requestId: crypto.randomUUID(),
        successUrl: "https://example.com/success",
        cancelUrl: "https://example.com/cancel",
      }),
    ).rejects.toThrow(PaymentConflictError);
  });
});
