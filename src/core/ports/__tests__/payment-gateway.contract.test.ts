/**
 * Contract tests for the PaymentGateway port.
 *
 * Any implementation (real Stripe adapter or FakePaymentGateway)
 * must satisfy these contracts. We run them against the fake here;
 * the same suite can be re-used against the real adapter in
 * integration tests.
 */
import { describe, it, expect, beforeEach } from "vitest";
import type { PaymentGateway } from "@/core/ports/payment-gateway";
import { FakePaymentGateway } from "./fake-payment-gateway";

/**
 * Reusable contract suite.  Call with a factory that produces a
 * fresh gateway instance.
 */
export const paymentGatewayContractSuite = (
  factory: () => PaymentGateway,
) => {
  let gw: PaymentGateway;

  beforeEach(() => {
    gw = factory();
  });

  /* ── checkout ── */

  describe("createCheckoutSession", () => {
    it("returns session with id and url", async () => {
      const result = await gw.createCheckoutSession({
        successUrl: "https://example.com/ok",
        cancelUrl: "https://example.com/cancel",
        currency: "USD",
        amountCents: 5000,
        description: "Test item",
        metadata: { dealId: "d1" },
      });

      expect(result).toHaveProperty("id");
      expect(typeof result.id).toBe("string");
      expect(result.id.length).toBeGreaterThan(0);
    });
  });

  describe("createRefund", () => {
    it("returns refund with id and status", async () => {
      const result = await gw.createRefund({
        paymentIntentId: "pi_test",
      });

      expect(result).toHaveProperty("id");
      expect(typeof result.id).toBe("string");
    });
  });

  describe("constructWebhookEvent", () => {
    it("returns event with id and type", () => {
      const result = gw.constructWebhookEvent({
        payload: "{}",
        signature: "sig_test",
      });

      expect(result).toHaveProperty("id");
      expect(result).toHaveProperty("type");
      expect(typeof result.type).toBe("string");
    });
  });

  /* ── connect ── */

  describe("createConnectAccount", () => {
    it("returns account with id", async () => {
      const result = await gw.createConnectAccount({
        email: "seller@example.com",
      });
      expect(result).toHaveProperty("id");
      expect(typeof result.id).toBe("string");
    });
  });

  describe("createConnectAccountLink", () => {
    it("returns link with url", async () => {
      const result = await gw.createConnectAccountLink({
        accountId: "acct_1",
        refreshUrl: "https://example.com/refresh",
        returnUrl: "https://example.com/return",
      });
      expect(result).toHaveProperty("url");
      expect(typeof result.url).toBe("string");
    });
  });

  describe("retrieveConnectAccount", () => {
    it("returns account details", async () => {
      const result = await gw.retrieveConnectAccount({
        accountId: "acct_1",
      });
      expect(result).toHaveProperty("id");
      expect(typeof result.detailsSubmitted).toBe("boolean");
      expect(typeof result.chargesEnabled).toBe("boolean");
      expect(typeof result.payoutsEnabled).toBe("boolean");
    });
  });

  /* ── transfers ── */

  describe("createTransfer", () => {
    it("returns transfer with id", async () => {
      const result = await gw.createTransfer({
        amountCents: 10000,
        currency: "USD",
        destinationAccountId: "acct_1",
        idempotencyKey: "idem_1",
      });
      expect(result).toHaveProperty("id");
      expect(typeof result.id).toBe("string");
    });
  });

  /* ── error injection ── */

  describe("error propagation", () => {
    it("throws when gateway reports failure", async () => {
      if ("errorToThrow" in gw) {
        (gw as FakePaymentGateway).errorToThrow = new Error("stripe_down");
        await expect(
          gw.createCheckoutSession({
            successUrl: "u",
            cancelUrl: "u",
            currency: "USD",
            amountCents: 100,
            description: "t",
            metadata: {},
          }),
        ).rejects.toThrow("stripe_down");
      }
    });
  });
};

/* ── Run against FakePaymentGateway ── */

describe("PaymentGateway contract (FakePaymentGateway)", () => {
  paymentGatewayContractSuite(() => new FakePaymentGateway());

  /* Fake-specific assertions */
  describe("call recording", () => {
    it("records checkout calls", async () => {
      const fake = new FakePaymentGateway();
      await fake.createCheckoutSession({
        successUrl: "u",
        cancelUrl: "c",
        currency: "USD",
        amountCents: 100,
        description: "d",
        metadata: { x: "1" },
      });
      expect(fake.checkoutCalls).toHaveLength(1);
      expect(fake.checkoutCalls[0].amountCents).toBe(100);
    });

    it("records transfer calls with idempotency key", async () => {
      const fake = new FakePaymentGateway();
      await fake.createTransfer({
        amountCents: 5000,
        currency: "USD",
        destinationAccountId: "acct_1",
        idempotencyKey: "ik_1",
      });
      expect(fake.transferCalls).toHaveLength(1);
      expect(fake.transferCalls[0].idempotencyKey).toBe("ik_1");
    });

    it("reset clears all calls", async () => {
      const fake = new FakePaymentGateway();
      await fake.createCheckoutSession({
        successUrl: "u",
        cancelUrl: "c",
        currency: "USD",
        amountCents: 100,
        description: "d",
        metadata: {},
      });
      await fake.createRefund({ paymentIntentId: "pi_1" });
      fake.reset();
      expect(fake.checkoutCalls).toHaveLength(0);
      expect(fake.refundCalls).toHaveLength(0);
    });
  });
});
