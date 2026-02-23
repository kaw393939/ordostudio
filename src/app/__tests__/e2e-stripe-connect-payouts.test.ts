import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { POST as postOffer } from "../api/v1/offers/route";
import { POST as postIntake } from "../api/v1/intake/route";
import { POST as postCreateDeal } from "../api/v1/admin/deals/route";
import { PATCH as patchDeal } from "../api/v1/admin/deals/[id]/route";
import { GET as getLedger, POST as postLedgerApprove } from "../api/v1/admin/ledger/route";
import { POST as postCheckout } from "../api/v1/admin/deals/[id]/checkout/route";
import { POST as postStripeWebhook } from "../api/v1/webhooks/stripe/route";
import { POST as postStripeConnect } from "../api/v1/account/stripe-connect/route";
import { POST as postPayouts } from "../api/v1/admin/ledger/payouts/route";

import {
  cleanupStandardE2EFixtures,
  setupStandardE2EFixture,
  type StandardE2EFixture,
} from "./helpers/e2e-fixtures";

vi.mock("@/adapters/stripe/stripe-client", async () => {
  return {
    createCheckoutSession: vi.fn(async () => ({
      id: "cs_test_payouts",
      url: "https://stripe.example/checkout/cs_test_payouts",
      payment_intent: "pi_test_payouts",
      metadata: null,
    })),
    createRefund: vi.fn(async () => ({ id: "re_test_payouts", status: "succeeded" })),
    constructWebhookEvent: vi.fn((input: { payload: string; signature: string }) => {
      const parsed = JSON.parse(input.payload) as { id: string; type: string; data: { object: unknown } };
      return parsed;
    }),
    createConnectAccount: vi.fn(async () => ({ id: "acct_test_123" })),
    createConnectAccountLink: vi.fn(async () => ({ url: "https://stripe.example/connect/onboarding/acct_test_123" })),
    retrieveConnectAccount: vi.fn(async () => ({
      id: "acct_test_123",
      details_submitted: true,
      charges_enabled: true,
      payouts_enabled: true,
    })),
    createTransfer: vi.fn(async () => ({ id: "tr_test_123" })),
  };
});

let fixture: StandardE2EFixture;

const requireResponse = (response: Response | undefined): Response => {
  if (!response) {
    throw new Error("Expected route handler to return a Response");
  }
  return response;
};

describe("e2e Stripe Connect onboarding + ledger payout execution", () => {
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

  it("creates Connect onboarding and pays out approved ledger entries via Stripe transfer", async () => {
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

    const approveDealResponse = requireResponse(
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

    expect(approveDealResponse.status).toBe(200);

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

    const stripeEventPayload = JSON.stringify({
      id: "evt_test_payouts_paid",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_test_payouts",
          payment_intent: "pi_test_payouts",
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
    const earnedBody = (await ledgerEarned.json()) as { items: { id: string; deal_id: string }[] };
    const dealEntries = earnedBody.items.filter((row) => row.deal_id === dealBody.id);
    expect(dealEntries.length).toBeGreaterThan(0);

    const approveLedgerResponse = requireResponse(
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

    expect(approveLedgerResponse.status).toBe(200);

    const connectResponse = await postStripeConnect(
      new Request("http://localhost:3000/api/v1/account/stripe-connect", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
          cookie: fixture.userCookie,
        },
        body: JSON.stringify({}),
      }),
    );

    expect(connectResponse.status).toBe(200);
    const connectBody = (await connectResponse.json()) as { onboarding_url: string };
    expect(connectBody.onboarding_url).toContain("stripe.example/connect/onboarding");

    const ledgerApproved = requireResponse(
      await getLedger(
        new Request("http://localhost:3000/api/v1/admin/ledger?status=APPROVED", {
          headers: { cookie: fixture.adminCookie },
        }),
      ),
    );

    expect(ledgerApproved.status).toBe(200);
    const approvedBody = (await ledgerApproved.json()) as { items: { id: string; deal_id: string; entry_type: string; beneficiary_user_id: string | null }[] };
    const payoutCandidates = approvedBody.items.filter(
      (row) => row.deal_id === dealBody.id && row.entry_type !== "PLATFORM_REVENUE" && !!row.beneficiary_user_id,
    );

    expect(payoutCandidates.length).toBe(1);

    const payoutResponse = await postPayouts(
      new Request("http://localhost:3000/api/v1/admin/ledger/payouts", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
          cookie: fixture.adminCookie,
        },
        body: JSON.stringify({ entry_ids: payoutCandidates.map((row) => row.id), confirm: true }),
      }),
    );

    expect(payoutResponse.status).toBe(200);
    const payoutBody = (await payoutResponse.json()) as { attempted: number; paid: number; failed: number };
    expect(payoutBody.attempted).toBe(1);
    expect(payoutBody.paid).toBe(1);
    expect(payoutBody.failed).toBe(0);

    const ledgerPaid = requireResponse(
      await getLedger(
        new Request("http://localhost:3000/api/v1/admin/ledger?status=PAID", {
          headers: { cookie: fixture.adminCookie },
        }),
      ),
    );

    expect(ledgerPaid.status).toBe(200);
    const paidBody = (await ledgerPaid.json()) as { items: { id: string; deal_id: string }[] };
    expect(paidBody.items.some((row) => row.deal_id === dealBody.id)).toBe(true);
  });
});
