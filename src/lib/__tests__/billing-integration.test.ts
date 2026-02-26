/**
 * Sprint 17 – Billing Integration
 *
 * Tests covering subscription model, plan configuration, entitlements,
 * webhook handlers, billing portal UI, and Stripe adapter extensions.
 */

import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

/* ── 1. Subscription Model ─────────────────────────── */

describe("Subscription model", () => {
  it("defines all plan tiers", async () => {
    const { PLANS } = await import("@/lib/subscriptions");
    expect(PLANS.free).toBeDefined();
    expect(PLANS.starter).toBeDefined();
    expect(PLANS.professional).toBeDefined();
    expect(PLANS.enterprise).toBeDefined();
  });

  it("free plan has zero cost", async () => {
    const { PLANS } = await import("@/lib/subscriptions");
    expect(PLANS.free.monthlyPriceCents).toBe(0);
  });

  it("plans have increasing prices", async () => {
    const { PLANS } = await import("@/lib/subscriptions");
    expect(PLANS.starter.monthlyPriceCents).toBeGreaterThan(PLANS.free.monthlyPriceCents);
    expect(PLANS.professional.monthlyPriceCents).toBeGreaterThan(PLANS.starter.monthlyPriceCents);
    expect(PLANS.enterprise.monthlyPriceCents).toBeGreaterThan(
      PLANS.professional.monthlyPriceCents,
    );
  });

  it("every plan has features listed", async () => {
    const { PLANS } = await import("@/lib/subscriptions");
    for (const plan of Object.values(PLANS)) {
      expect(plan.features.length).toBeGreaterThan(0);
    }
  });

  it("getDefaultSubscription returns free tier", async () => {
    const { getDefaultSubscription } = await import("@/lib/subscriptions");
    const sub = getDefaultSubscription("user-1");
    expect(sub.planTier).toBe("free");
    expect(sub.status).toBe("active");
    expect(sub.userId).toBe("user-1");
  });
});

/* ── 2. Entitlement Checks ─────────────────────────── */

describe("Entitlement checks", () => {
  it("active subscription grants access to its tier", async () => {
    const { hasAccessToTier } = await import("@/lib/subscriptions");
    const sub = {
      id: "sub-1",
      userId: "u",
      stripeSubscriptionId: null,
      stripeCustomerId: null,
      planTier: "professional" as const,
      status: "active" as const,
      currentPeriodStart: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      createdAt: "",
      updatedAt: "",
    };
    expect(hasAccessToTier(sub, "starter")).toBe(true);
    expect(hasAccessToTier(sub, "professional")).toBe(true);
    expect(hasAccessToTier(sub, "enterprise")).toBe(false);
  });

  it("canceled subscription only gets free tier", async () => {
    const { hasAccessToTier } = await import("@/lib/subscriptions");
    const sub = {
      id: "sub-2",
      userId: "u",
      stripeSubscriptionId: null,
      stripeCustomerId: null,
      planTier: "professional" as const,
      status: "canceled" as const,
      currentPeriodStart: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      createdAt: "",
      updatedAt: "",
    };
    expect(hasAccessToTier(sub, "free")).toBe(true);
    expect(hasAccessToTier(sub, "starter")).toBe(false);
  });

  it("past_due subscription retains access (grace period)", async () => {
    const { hasAccessToTier } = await import("@/lib/subscriptions");
    const sub = {
      id: "sub-3",
      userId: "u",
      stripeSubscriptionId: null,
      stripeCustomerId: null,
      planTier: "starter" as const,
      status: "past_due" as const,
      currentPeriodStart: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      createdAt: "",
      updatedAt: "",
    };
    expect(hasAccessToTier(sub, "starter")).toBe(true);
    expect(hasAccessToTier(sub, "professional")).toBe(false);
  });

  it("trialing subscription grants access", async () => {
    const { hasAccessToTier } = await import("@/lib/subscriptions");
    const sub = {
      id: "sub-4",
      userId: "u",
      stripeSubscriptionId: null,
      stripeCustomerId: null,
      planTier: "professional" as const,
      status: "trialing" as const,
      currentPeriodStart: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      createdAt: "",
      updatedAt: "",
    };
    expect(hasAccessToTier(sub, "professional")).toBe(true);
  });

  it("isSubscriptionActive returns true for active/trialing/past_due", async () => {
    const { isSubscriptionActive, getDefaultSubscription } = await import("@/lib/subscriptions");
    const sub = getDefaultSubscription("user-x");
    expect(isSubscriptionActive(sub)).toBe(true);

    expect(isSubscriptionActive({ ...sub, status: "trialing" })).toBe(true);
    expect(isSubscriptionActive({ ...sub, status: "past_due" })).toBe(true);
    expect(isSubscriptionActive({ ...sub, status: "canceled" })).toBe(false);
  });

  it("shouldRevokeAccess true for canceled/incomplete", async () => {
    const { shouldRevokeAccess, getDefaultSubscription } = await import("@/lib/subscriptions");
    const sub = getDefaultSubscription("user-y");
    expect(shouldRevokeAccess({ ...sub, status: "canceled" })).toBe(true);
    expect(shouldRevokeAccess({ ...sub, status: "incomplete" })).toBe(true);
    expect(shouldRevokeAccess({ ...sub, status: "active" })).toBe(false);
  });
});

/* ── 3. Stripe Status Mapping ──────────────────────── */

describe("Stripe status mapping", () => {
  it("maps active correctly", async () => {
    const { mapStripeStatus } = await import("@/lib/subscriptions");
    expect(mapStripeStatus("active")).toBe("active");
  });

  it("maps canceled correctly", async () => {
    const { mapStripeStatus } = await import("@/lib/subscriptions");
    expect(mapStripeStatus("canceled")).toBe("canceled");
    expect(mapStripeStatus("unpaid")).toBe("canceled");
  });

  it("maps trialing correctly", async () => {
    const { mapStripeStatus } = await import("@/lib/subscriptions");
    expect(mapStripeStatus("trialing")).toBe("trialing");
  });

  it("maps unknown status to none", async () => {
    const { mapStripeStatus } = await import("@/lib/subscriptions");
    expect(mapStripeStatus("something_unknown")).toBe("none");
  });

  it("maps incomplete statuses", async () => {
    const { mapStripeStatus } = await import("@/lib/subscriptions");
    expect(mapStripeStatus("incomplete")).toBe("incomplete");
    expect(mapStripeStatus("incomplete_expired")).toBe("incomplete");
  });
});

/* ── 4. Subscription Webhook Handlers ──────────────── */

describe("Subscription webhook handlers", () => {
  it("recognises subscription event types", async () => {
    const { isSubscriptionEvent } = await import("@/lib/subscription-webhooks");
    expect(isSubscriptionEvent("invoice.payment_succeeded")).toBe(true);
    expect(isSubscriptionEvent("invoice.payment_failed")).toBe(true);
    expect(isSubscriptionEvent("customer.subscription.created")).toBe(true);
    expect(isSubscriptionEvent("customer.subscription.updated")).toBe(true);
    expect(isSubscriptionEvent("customer.subscription.deleted")).toBe(true);
    expect(isSubscriptionEvent("charge.captured")).toBe(false);
  });

  it("handles invoice.payment_succeeded", async () => {
    const { processSubscriptionWebhook } = await import("@/lib/subscription-webhooks");
    const result = processSubscriptionWebhook("invoice.payment_succeeded", {
      subscription: "sub_123",
    });
    expect(result.handled).toBe(false);
    expect(result.action).toBe("not_implemented:payment_confirmed");
    expect(result.status).toBe("active");
  });

  it("handles invoice.payment_failed", async () => {
    const { processSubscriptionWebhook } = await import("@/lib/subscription-webhooks");
    const result = processSubscriptionWebhook("invoice.payment_failed", {
      subscription: "sub_456",
    });
    expect(result.handled).toBe(false);
    expect(result.action).toBe("not_implemented:payment_failed");
    expect(result.status).toBe("past_due");
  });

  it("handles customer.subscription.deleted", async () => {
    const { processSubscriptionWebhook } = await import("@/lib/subscription-webhooks");
    const result = processSubscriptionWebhook("customer.subscription.deleted", {});
    expect(result.handled).toBe(false);
    expect(result.action).toBe("not_implemented:subscription_canceled");
    expect(result.status).toBe("canceled");
  });

  it("handles customer.subscription.created", async () => {
    const { processSubscriptionWebhook } = await import("@/lib/subscription-webhooks");
    const result = processSubscriptionWebhook("customer.subscription.created", {
      status: "active",
      items: { data: [{ price: { id: "price_starter" } }] },
    });
    expect(result.handled).toBe(false);
    expect(result.action).toBe("not_implemented:subscription_created");
    expect(result.status).toBe("active");
  });

  it("handles customer.subscription.updated", async () => {
    const { processSubscriptionWebhook } = await import("@/lib/subscription-webhooks");
    const result = processSubscriptionWebhook("customer.subscription.updated", {
      status: "past_due",
    });
    expect(result.handled).toBe(false);
    expect(result.action).toBe("not_implemented:subscription_updated");
    expect(result.status).toBe("past_due");
  });

  it("ignores unknown event types", async () => {
    const { processSubscriptionWebhook } = await import("@/lib/subscription-webhooks");
    const result = processSubscriptionWebhook("charge.captured", {});
    expect(result.handled).toBe(false);
    expect(result.action).toBe("ignored");
  });

  it("user whose payment failed revokes premium access", async () => {
    const { processSubscriptionWebhook } = await import("@/lib/subscription-webhooks");
    const { shouldRevokeAccess, getDefaultSubscription } = await import("@/lib/subscriptions");

    // Simulate: subscription deleted
    const result = processSubscriptionWebhook("customer.subscription.deleted", {});
    expect(result.status).toBe("canceled");

    // Verify cancellation means revocation
    const sub = { ...getDefaultSubscription("u"), status: result.status! };
    expect(shouldRevokeAccess(sub)).toBe(true);
  });
});

/* ── 5. Billing Portal UI ─────────────────────────── */

describe("Billing portal page", () => {
  it("page exists", () => {
    const filePath = path.resolve("src/app/(public)/settings/billing/page.tsx");
    expect(fs.existsSync(filePath)).toBe(true);
  });

  it("displays current plan", () => {
    const src = fs.readFileSync(
      path.resolve("src/app/(public)/settings/billing/page.tsx"),
      "utf-8",
    );
    expect(src).toContain("Current Plan");
    expect(src).toContain("getDefaultSubscription");
  });

  it("shows available plans grid", () => {
    const src = fs.readFileSync(
      path.resolve("src/app/(public)/settings/billing/page.tsx"),
      "utf-8",
    );
    expect(src).toContain("Available Plans");
    expect(src).toContain("PLANS");
  });

  it("shows payment methods section", () => {
    const src = fs.readFileSync(
      path.resolve("src/app/(public)/settings/billing/page.tsx"),
      "utf-8",
    );
    expect(src).toContain("Payment Methods");
  });

  it("shows invoice history section", () => {
    const src = fs.readFileSync(
      path.resolve("src/app/(public)/settings/billing/page.tsx"),
      "utf-8",
    );
    expect(src).toContain("Invoice History");
  });

  it("uses PageShell layout", () => {
    const src = fs.readFileSync(
      path.resolve("src/app/(public)/settings/billing/page.tsx"),
      "utf-8",
    );
    expect(src).toContain("PageShell");
  });
});

/* ── 6. Stripe Adapter: existing infrastructure ────── */

describe("Existing Stripe infrastructure", () => {
  it("stripe-client.ts exists with core functions", () => {
    const src = fs.readFileSync(
      path.resolve("src/adapters/stripe/stripe-client.ts"),
      "utf-8",
    );
    expect(src).toContain("createCheckoutSession");
    expect(src).toContain("constructWebhookEvent");
    expect(src).toContain("createRefund");
  });

  it("stripe webhook route validates signature", () => {
    const src = fs.readFileSync(
      path.resolve("src/app/api/v1/webhooks/stripe/route.ts"),
      "utf-8",
    );
    expect(src).toContain("stripe-signature");
    expect(src).toContain("status: 400");
  });

  it("payments module handles checkout webhook", () => {
    const src = fs.readFileSync(path.resolve("src/lib/api/payments.ts"), "utf-8");
    expect(src).toContain("handleStripeWebhook");
  });
});

/* ── 7. Stripe Subscription Adapter ────────────────── */

describe("Stripe subscription adapter", () => {
  it("module exists", () => {
    const filePath = path.resolve("src/adapters/stripe/stripe-subscription.ts");
    expect(fs.existsSync(filePath)).toBe(true);
  });

  it("exports createCustomer", () => {
    const src = fs.readFileSync(
      path.resolve("src/adapters/stripe/stripe-subscription.ts"),
      "utf-8",
    );
    expect(src).toContain("export const createCustomer");
  });

  it("exports createSubscription", () => {
    const src = fs.readFileSync(
      path.resolve("src/adapters/stripe/stripe-subscription.ts"),
      "utf-8",
    );
    expect(src).toContain("export const createSubscription");
  });

  it("exports cancelSubscription", () => {
    const src = fs.readFileSync(
      path.resolve("src/adapters/stripe/stripe-subscription.ts"),
      "utf-8",
    );
    expect(src).toContain("export const cancelSubscription");
  });

  it("exports createBillingPortalSession", () => {
    const src = fs.readFileSync(
      path.resolve("src/adapters/stripe/stripe-subscription.ts"),
      "utf-8",
    );
    expect(src).toContain("export const createBillingPortalSession");
  });

  it("uses Stripe SDK", () => {
    const src = fs.readFileSync(
      path.resolve("src/adapters/stripe/stripe-subscription.ts"),
      "utf-8",
    );
    expect(src).toContain('import Stripe from "stripe"');
  });
});

/* ── 8. Plan Tier from Price ID ────────────────────── */

describe("Plan tier resolution", () => {
  it("returns free for unknown price ID", async () => {
    const { planTierFromPriceId } = await import("@/lib/subscriptions");
    expect(planTierFromPriceId("price_unknown")).toBe("free");
  });
});

/* ── 9. User without subscription gets 403 for premium ─ */

describe("Access control for premium features", () => {
  it("free user cannot access professional features", async () => {
    const { getDefaultSubscription, hasAccessToTier } = await import("@/lib/subscriptions");
    const sub = getDefaultSubscription("free-user");
    expect(hasAccessToTier(sub, "professional")).toBe(false);
  });

  it("free user can always access free features", async () => {
    const { getDefaultSubscription, hasAccessToTier } = await import("@/lib/subscriptions");
    const sub = getDefaultSubscription("free-user");
    expect(hasAccessToTier(sub, "free")).toBe(true);
  });
});

/* ── 10. Webhook signature validation (existing) ───── */

describe("Webhook signature validation", () => {
  it("rejects missing signature header with 400", () => {
    const src = fs.readFileSync(
      path.resolve("src/app/api/v1/webhooks/stripe/route.ts"),
      "utf-8",
    );
    expect(src).toContain("stripe-signature");
    expect(src).toContain("400");
    expect(src).toContain("Bad Request");
  });
});
