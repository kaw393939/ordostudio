import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/adapters/stripe/stripe-client", () => {
  return {
    createCheckoutSession: vi.fn(async () => ({
      id: "cs_test_123",
      url: "https://stripe.test/checkout/cs_test_123",
      payment_intent: "pi_test_123",
      metadata: null,
    })),
    createRefund: vi.fn(async () => ({ id: "re_test_123", status: "succeeded" })),
    constructWebhookEvent: vi.fn(({ payload }: { payload: string }) => {
      const parsed = JSON.parse(payload) as {
        id: string;
        type: string;
        data: { object: unknown };
      };

      return {
        id: parsed.id,
        type: parsed.type,
        data: {
          object: parsed.data.object,
        },
      };
    }),
  };
});

import { POST as postOffer } from "../api/v1/offers/route";
import { POST as postIntake } from "../api/v1/intake/route";
import { POST as postCreateDeal } from "../api/v1/admin/deals/route";
import { GET as getDeal } from "../api/v1/admin/deals/[id]/route";
import { POST as postCheckout } from "../api/v1/admin/deals/[id]/checkout/route";
import { POST as postRefund } from "../api/v1/admin/deals/[id]/refund/route";
import { POST as postStripeWebhook } from "../api/v1/webhooks/stripe/route";

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

describe("e2e Stripe payments", () => {
  beforeEach(async () => {
    fixture = await setupStandardE2EFixture();
    process.env.APPCTL_ENV = "local";
    process.env.STRIPE_SECRET_KEY = "sk_test_fake";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_fake";
  });

  afterEach(async () => {
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_WEBHOOK_SECRET;
    await cleanupStandardE2EFixtures();
  });

  it("creates checkout, processes webhook idempotently, and issues refund", async () => {
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
          goals: "Need help with marketplace checkout",
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
    const createdDeal = (await createDealResponse.json()) as { id: string };

    const checkoutResponse = requireResponse(
      await postCheckout(
        new Request(`http://localhost:3000/api/v1/admin/deals/${createdDeal.id}/checkout`, {
          method: "POST",
          headers: {
            origin: "http://localhost:3000",
            cookie: fixture.adminCookie,
          },
        }),
        { params: Promise.resolve({ id: createdDeal.id }) },
      ),
    );

    expect(checkoutResponse.status).toBe(201);
    const checkoutBody = (await checkoutResponse.json()) as { checkout_url: string; payment: { id: string } };
    expect(checkoutBody.checkout_url).toContain("https://stripe.test/checkout/");

    const eventPayload = JSON.stringify({
      id: "evt_test_1",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_test_123",
          payment_intent: "pi_test_123",
          metadata: {
            deal_id: createdDeal.id,
            payment_id: checkoutBody.payment.id,
          },
        },
      },
    });

    const webhookResponse = await postStripeWebhook(
      new Request("http://localhost:3000/api/v1/webhooks/stripe", {
        method: "POST",
        headers: {
          "stripe-signature": "sig_test",
        },
        body: eventPayload,
      }),
    );

    expect(webhookResponse.status).toBe(200);
    const webhookBody = (await webhookResponse.json()) as { ok: boolean; processed: boolean; duplicate: boolean };
    expect(webhookBody.ok).toBe(true);
    expect(webhookBody.processed).toBe(true);
    expect(webhookBody.duplicate).toBe(false);

    const webhookDupResponse = await postStripeWebhook(
      new Request("http://localhost:3000/api/v1/webhooks/stripe", {
        method: "POST",
        headers: {
          "stripe-signature": "sig_test",
        },
        body: eventPayload,
      }),
    );

    expect(webhookDupResponse.status).toBe(200);
    const webhookDupBody = (await webhookDupResponse.json()) as { ok: boolean; processed: boolean; duplicate: boolean };
    expect(webhookDupBody.ok).toBe(true);
    expect(webhookDupBody.processed).toBe(false);
    expect(webhookDupBody.duplicate).toBe(true);

    const dealAfterPaid = requireResponse(
      await getDeal(
        new Request(`http://localhost:3000/api/v1/admin/deals/${createdDeal.id}`, {
          headers: { cookie: fixture.adminCookie },
        }),
        { params: Promise.resolve({ id: createdDeal.id }) },
      ),
    );

    expect(dealAfterPaid.status).toBe(200);
    const dealAfterPaidBody = (await dealAfterPaid.json()) as { status: string };
    expect(dealAfterPaidBody.status).toBe("PAID");

    const refundWithoutConfirm = requireResponse(
      await postRefund(
        new Request(`http://localhost:3000/api/v1/admin/deals/${createdDeal.id}/refund`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            origin: "http://localhost:3000",
            cookie: fixture.adminCookie,
          },
          body: JSON.stringify({ reason: "Client requested", confirm: false }),
        }),
        { params: Promise.resolve({ id: createdDeal.id }) },
      ),
    );

    expect(refundWithoutConfirm.status).toBe(412);

    const refundResponse = requireResponse(
      await postRefund(
        new Request(`http://localhost:3000/api/v1/admin/deals/${createdDeal.id}/refund`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            origin: "http://localhost:3000",
            cookie: fixture.adminCookie,
          },
          body: JSON.stringify({ reason: "Client requested", confirm: true }),
        }),
        { params: Promise.resolve({ id: createdDeal.id }) },
      ),
    );

    expect(refundResponse.status).toBe(200);

    const dealAfterRefund = requireResponse(
      await getDeal(
        new Request(`http://localhost:3000/api/v1/admin/deals/${createdDeal.id}`, {
          headers: { cookie: fixture.adminCookie },
        }),
        { params: Promise.resolve({ id: createdDeal.id }) },
      ),
    );

    expect(dealAfterRefund.status).toBe(200);
    const dealAfterRefundBody = (await dealAfterRefund.json()) as { status: string };
    expect(dealAfterRefundBody.status).toBe("REFUNDED");
  });
});
