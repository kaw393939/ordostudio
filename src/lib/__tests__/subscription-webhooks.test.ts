/**
 * SUB-01: Subscription webhook stub audit
 *
 * Verifies:
 * - All recognised event types return `handled: false` (stub signal)
 * - Correct action prefix per event type
 * - `isSubscriptionEvent` type guard
 * - Missing subscription ID is handled gracefully
 * - `extractPriceId` edge cases via customer.subscription.created
 * - Unknown events return { handled: false, action: "ignored" }
 */
import { describe, it, expect } from "vitest";
import {
  isSubscriptionEvent,
  processSubscriptionWebhook,
  SUBSCRIPTION_WEBHOOK_EVENTS,
} from "@/lib/subscription-webhooks";

describe("SUB-01 — subscription webhook stub audit", () => {
  describe("isSubscriptionEvent type guard", () => {
    it("returns true for all known event types in the const array", () => {
      for (const eventType of SUBSCRIPTION_WEBHOOK_EVENTS) {
        expect(isSubscriptionEvent(eventType)).toBe(true);
      }
    });

    it("returns false for an unknown event type", () => {
      expect(isSubscriptionEvent("charge.failed")).toBe(false);
    });

    it("returns false for an empty string", () => {
      expect(isSubscriptionEvent("")).toBe(false);
    });

    it("returns false for a near-match that differs by one character", () => {
      // Ensure no unintentional prefix-match or substring-match behaviour
      expect(isSubscriptionEvent("customer.subscription.delete")).toBe(false);
    });
  });

  describe("processSubscriptionWebhook — stub returns handled:false", () => {
    it("unknown event returns { handled:false, action:'ignored' }", () => {
      const result = processSubscriptionWebhook("charge.failed", {});
      expect(result.handled).toBe(false);
      expect(result.action).toBe("ignored");
    });

    it("invoice.payment_succeeded returns handled:false with not_implemented prefix", () => {
      const result = processSubscriptionWebhook("invoice.payment_succeeded", {
        subscription: "sub_123",
      });
      expect(result.handled).toBe(false);
      expect(result.action).toBe("not_implemented:payment_confirmed");
      expect(result.status).toBe("active");
      // userId retains the Stripe subscription ID as-is (stub placeholder)
      expect(result.userId).toBe("sub:sub_123");
    });

    it("invoice.payment_succeeded with no subscription ID has userId undefined", () => {
      const result = processSubscriptionWebhook("invoice.payment_succeeded", {});
      expect(result.handled).toBe(false);
      expect(result.userId).toBeUndefined();
    });

    it("invoice.payment_failed returns handled:false, status:past_due", () => {
      const result = processSubscriptionWebhook("invoice.payment_failed", {
        subscription: "sub_456",
      });
      expect(result.handled).toBe(false);
      expect(result.action).toBe("not_implemented:payment_failed");
      expect(result.status).toBe("past_due");
      expect(result.userId).toBe("sub:sub_456");
    });

    it("invoice.payment_failed with no subscription ID has userId undefined", () => {
      const result = processSubscriptionWebhook("invoice.payment_failed", {});
      expect(result.userId).toBeUndefined();
    });

    it("customer.subscription.created returns handled:false, planTier derived from priceId", () => {
      const result = processSubscriptionWebhook(
        "customer.subscription.created",
        {
          status: "active",
          items: { data: [{ price: { id: "price_professional_monthly" } }] },
        },
      );
      expect(result.handled).toBe(false);
      expect(result.action).toBe("not_implemented:subscription_created");
      expect(result.status).toBe("active");
      // planTier comes from planTierFromPriceId — whatever value it maps to
      expect(result.planTier).toBeDefined();
    });

    it("customer.subscription.created with no items defaults planTier to 'free'", () => {
      const result = processSubscriptionWebhook("customer.subscription.created", {
        status: "trialing",
      });
      expect(result.handled).toBe(false);
      expect(result.planTier).toBe("free");
    });

    it("customer.subscription.created with empty items array defaults planTier to 'free'", () => {
      const result = processSubscriptionWebhook("customer.subscription.created", {
        status: "active",
        items: { data: [] },
      });
      expect(result.handled).toBe(false);
      expect(result.planTier).toBe("free");
    });

    it("customer.subscription.created with malformed items does not throw", () => {
      // Defensive: items without a .data property
      expect(() =>
        processSubscriptionWebhook("customer.subscription.created", {
          status: "active",
          items: {},
        }),
      ).not.toThrow();
    });

    it("customer.subscription.updated returns handled:false", () => {
      const result = processSubscriptionWebhook("customer.subscription.updated", {
        status: "past_due",
        items: { data: [{ price: { id: "price_starter" } }] },
      });
      expect(result.handled).toBe(false);
      expect(result.action).toBe("not_implemented:subscription_updated");
      expect(result.status).toBe("past_due");
    });

    it("customer.subscription.updated with no priceId has planTier undefined", () => {
      const result = processSubscriptionWebhook("customer.subscription.updated", {
        status: "active",
      });
      expect(result.handled).toBe(false);
      expect(result.planTier).toBeUndefined();
    });

    it("customer.subscription.deleted returns handled:false, status:canceled", () => {
      const result = processSubscriptionWebhook("customer.subscription.deleted", {});
      expect(result.handled).toBe(false);
      expect(result.action).toBe("not_implemented:subscription_canceled");
      expect(result.status).toBe("canceled");
    });
  });

  describe("no recognised event returns handled:true (stub invariant)", () => {
    it.each([...SUBSCRIPTION_WEBHOOK_EVENTS])(
      "%s returns handled:false",
      (eventType) => {
        const result = processSubscriptionWebhook(eventType, {
          status: "active",
          subscription: "sub_test",
        });
        expect(result.handled).toBe(false);
      },
    );
  });
});
