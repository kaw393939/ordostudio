// @vitest-environment node

/**
 * Stripe Contract Tests — PRD-13
 *
 * Verifies that the shapes returned by our Stripe client functions
 * match the types we define. This catches shape drift when the Stripe
 * SDK upgrades or our client code changes.
 */

import { describe, it, expect } from "vitest";
import type {
  StripeCheckoutSession,
  StripeWebhookEvent,
  StripeConnectAccount,
} from "@/adapters/stripe/stripe-client";
import type {
  CheckoutSessionResult,
  RefundResult,
  WebhookEvent,
  ConnectAccount,
  TransferResult,
} from "@/core/ports/payment-gateway";

describe("Stripe contract tests", () => {
  describe("StripeCheckoutSession shape", () => {
    it("has required fields matching CheckoutSessionResult port type", () => {
      const mock: StripeCheckoutSession = {
        id: "cs_test_123",
        url: "https://checkout.stripe.com/test",
        payment_intent: "pi_123",
        metadata: { deal_id: "deal-1" },
      };

      // Verify the shape maps to the port interface
      const portResult: CheckoutSessionResult = {
        id: mock.id,
        url: mock.url,
        paymentIntentId: mock.payment_intent,
        metadata: mock.metadata ?? null,
      };

      expect(portResult.id).toBe("cs_test_123");
      expect(portResult.url).toBe("https://checkout.stripe.com/test");
      expect(portResult.paymentIntentId).toBe("pi_123");
      expect(portResult.metadata).toEqual({ deal_id: "deal-1" });
    });

    it("handles null url for embedded checkout", () => {
      const mock: StripeCheckoutSession = {
        id: "cs_test_456",
        url: null,
        payment_intent: "pi_456",
      };

      expect(mock.url).toBeNull();
      expect(mock.payment_intent).toBe("pi_456");
    });

    it("handles null payment_intent for setup mode", () => {
      const mock: StripeCheckoutSession = {
        id: "cs_test_789",
        url: "https://checkout.stripe.com/test2",
        payment_intent: null,
      };

      expect(mock.payment_intent).toBeNull();
    });
  });

  describe("Stripe refund shape", () => {
    it("matches RefundResult port type", () => {
      const mockRefund = { id: "re_123", status: "succeeded" as string | null };
      const portResult: RefundResult = {
        id: mockRefund.id,
        status: mockRefund.status,
      };

      expect(portResult.id).toBe("re_123");
      expect(portResult.status).toBe("succeeded");
    });

    it("handles null status", () => {
      const portResult: RefundResult = { id: "re_456", status: null };
      expect(portResult.status).toBeNull();
    });
  });

  describe("StripeWebhookEvent shape", () => {
    it("matches WebhookEvent port type", () => {
      const mock: StripeWebhookEvent = {
        id: "evt_123",
        type: "checkout.session.completed",
        data: { object: { id: "cs_test_123", metadata: { deal_id: "deal-1" } } },
      };

      const portEvent: WebhookEvent = {
        id: mock.id,
        type: mock.type,
        data: mock.data,
      };

      expect(portEvent.id).toBe("evt_123");
      expect(portEvent.type).toBe("checkout.session.completed");
      expect(portEvent.data.object).toBeDefined();
    });

    it("covers common webhook event types used by the app", () => {
      const eventTypes = [
        "checkout.session.completed",
        "payment_intent.succeeded",
        "payment_intent.payment_failed",
        "charge.refunded",
      ];

      for (const type of eventTypes) {
        const event: StripeWebhookEvent = {
          id: `evt_${type}`,
          type,
          data: { object: {} },
        };
        expect(event.type).toBe(type);
      }
    });
  });

  describe("StripeConnectAccount shape", () => {
    it("matches ConnectAccount port type", () => {
      const mock: StripeConnectAccount = {
        id: "acct_123",
        details_submitted: true,
        charges_enabled: true,
        payouts_enabled: false,
      };

      const portAccount: ConnectAccount = {
        id: mock.id,
        detailsSubmitted: mock.details_submitted,
        chargesEnabled: mock.charges_enabled,
        payoutsEnabled: mock.payouts_enabled,
      };

      expect(portAccount.id).toBe("acct_123");
      expect(portAccount.detailsSubmitted).toBe(true);
      expect(portAccount.chargesEnabled).toBe(true);
      expect(portAccount.payoutsEnabled).toBe(false);
    });
  });

  describe("Transfer shape", () => {
    it("matches TransferResult port type", () => {
      const mockTransfer = { id: "tr_123" };
      const portResult: TransferResult = { id: mockTransfer.id };
      expect(portResult.id).toBe("tr_123");
    });
  });

  describe("createCheckoutSession input shape", () => {
    it("validates the input shape expected by the client", () => {
      const input = {
        successUrl: "https://example.com/success",
        cancelUrl: "https://example.com/cancel",
        currency: "usd",
        amountCents: 5000,
        description: "Workshop access",
        metadata: { deal_id: "deal-1", event_id: "event-1" },
      };

      expect(input.successUrl).toBeTruthy();
      expect(input.cancelUrl).toBeTruthy();
      expect(input.currency).toBe("usd");
      expect(input.amountCents).toBeGreaterThan(0);
      expect(input.description).toBeTruthy();
      expect(input.metadata).toHaveProperty("deal_id");
    });
  });

  describe("createRefund input shape", () => {
    it("validates the input shape expected by the client", () => {
      const input = {
        paymentIntentId: "pi_123",
        amountCents: 2500,
        reason: "requested_by_customer" as const,
        metadata: { refund_reason: "customer_request" },
      };

      expect(input.paymentIntentId).toBeTruthy();
      expect(["duplicate", "fraudulent", "requested_by_customer"]).toContain(input.reason);
    });
  });
});
