import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Database from "better-sqlite3";

import { POST as postOffer } from "../../../offers/route";
import { POST as postIntake } from "../../../intake/route";
import { POST as postCreateDeal } from "../route";
import { GET as getDeal } from "../[id]/route";

import {
  cleanupStandardE2EFixtures,
  setupStandardE2EFixture,
  type StandardE2EFixture,
} from "../../../../../__tests__/helpers/e2e-fixtures";

const requireResponse = (response: Response | undefined): Response => {
  if (!response) {
    throw new Error("Expected route handler to return a Response");
  }
  return response;
};

vi.mock("@/adapters/stripe/stripe-client", async () => {
  return {
    createCheckoutSession: vi.fn(async () => ({
      id: "cs_test_123",
      url: "https://stripe.example/checkout/cs_test_123",
      payment_intent: "pi_test_123",
      metadata: null,
    })),
    createRefund: vi.fn(async () => ({ id: "re_test_123", status: "succeeded" })),
    constructWebhookEvent: vi.fn((input: { payload: string; signature: string }) => {
      const parsed = JSON.parse(input.payload) as { id: string; type: string; data: { object: unknown } };
      return parsed;
    }),
  };
});

let fixture: StandardE2EFixture;

describe("admin deals payments", () => {
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

  it("creates checkout, marks deal PAID via webhook, and refunds via admin console", async () => {
    const { POST: postCheckout } = await import("../[id]/checkout/route");
    const { POST: postRefund } = await import("../[id]/refund/route");
    const { POST: postStripeWebhook } = await import("../../../webhooks/stripe/route");

    const stripeClient = await import("@/adapters/stripe/stripe-client");
    expect(vi.isMockFunction(stripeClient.createCheckoutSession)).toBe(true);
    expect(vi.isMockFunction(stripeClient.createRefund)).toBe(true);
    expect(vi.isMockFunction(stripeClient.constructWebhookEvent)).toBe(true);

    expect(process.env.APPCTL_DB_FILE).toBe(fixture.dbPath);

    {
      const db = new Database(fixture.dbPath);
      const paymentsTable = db
        .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'deal_payments'")
        .get() as { name: string } | undefined;
      const webhooksTable = db
        .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'stripe_webhook_events'")
        .get() as { name: string } | undefined;
      db.close();

      expect(paymentsTable?.name).toBe("deal_payments");
      expect(webhooksTable?.name).toBe("stripe_webhook_events");
    }

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
          body: JSON.stringify({ intake_id: intakeBody.id }),
        }),
      ),
    );

    expect(createDealResponse.status).toBe(201);
    const dealBody = (await createDealResponse.json()) as { id: string };

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

    const checkoutText = await checkoutResponse.text();
    expect(checkoutResponse.status, checkoutText).toBe(201);
    const checkoutBody = JSON.parse(checkoutText) as { checkout_url: string; payment: { id: string } };
    expect(checkoutBody.checkout_url).toContain("stripe.example");

    const stripeEventPayload = JSON.stringify({
      id: "evt_test_123",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_test_123",
          payment_intent: "pi_test_123",
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

    const dealAfterPaid = requireResponse(
      await getDeal(
        new Request(`http://localhost:3000/api/v1/admin/deals/${dealBody.id}`, {
          headers: { cookie: fixture.adminCookie },
        }),
        { params: Promise.resolve({ id: dealBody.id }) },
      ),
    );

    expect(dealAfterPaid.status).toBe(200);
    const paidBody = (await dealAfterPaid.json()) as { status: string };
    expect(paidBody.status).toBe("PAID");

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

    const dealAfterRefund = requireResponse(
      await getDeal(
        new Request(`http://localhost:3000/api/v1/admin/deals/${dealBody.id}`, {
          headers: { cookie: fixture.adminCookie },
        }),
        { params: Promise.resolve({ id: dealBody.id }) },
      ),
    );

    const refundedBody = (await dealAfterRefund.json()) as { status: string };
    expect(refundedBody.status).toBe("REFUNDED");

    // Webhook idempotency: replay event.
    const webhookReplay = await postStripeWebhook(
      new Request("http://localhost:3000/api/v1/webhooks/stripe", {
        method: "POST",
        headers: {
          "stripe-signature": "t=0,v1=dummy",
        },
        body: stripeEventPayload,
      }),
    );

    expect(webhookReplay.status).toBe(200);
  });
});
