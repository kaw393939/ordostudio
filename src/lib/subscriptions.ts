/**
 * Subscription domain model.
 *
 * Manages subscription lifecycle, plan configuration,
 * and entitlement checks based on subscription status.
 */

/* ── Plan configuration ─────────────────────────────── */

export type PlanTier = "free" | "starter" | "professional" | "enterprise";

export type PlanConfig = {
  tier: PlanTier;
  name: string;
  stripePriceId: string | null;
  features: string[];
  monthlyPriceCents: number;
};

export const PLANS: Record<PlanTier, PlanConfig> = {
  free: {
    tier: "free",
    name: "Free",
    stripePriceId: null,
    features: ["Browse events", "Public resources", "Newsletter"],
    monthlyPriceCents: 0,
  },
  starter: {
    tier: "starter",
    name: "Starter",
    stripePriceId: process.env.STRIPE_PRICE_STARTER ?? null,
    features: ["All Free features", "Event registration", "Profile customisation"],
    monthlyPriceCents: 2900,
  },
  professional: {
    tier: "professional",
    name: "Professional",
    stripePriceId: process.env.STRIPE_PRICE_PROFESSIONAL ?? null,
    features: [
      "All Starter features",
      "Client dashboard",
      "Priority support",
      "Session recordings",
    ],
    monthlyPriceCents: 9900,
  },
  enterprise: {
    tier: "enterprise",
    name: "Enterprise",
    stripePriceId: process.env.STRIPE_PRICE_ENTERPRISE ?? null,
    features: [
      "All Professional features",
      "Custom integrations",
      "Dedicated account manager",
      "SLA guarantee",
    ],
    monthlyPriceCents: 29900,
  },
};

/* ── Subscription status ─────────────────────────────── */

export type SubscriptionStatus =
  | "active"
  | "past_due"
  | "canceled"
  | "trialing"
  | "incomplete"
  | "none";

export type Subscription = {
  id: string;
  userId: string;
  stripeSubscriptionId: string | null;
  stripeCustomerId: string | null;
  planTier: PlanTier;
  status: SubscriptionStatus;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  createdAt: string;
  updatedAt: string;
};

/* ── Entitlement checks ──────────────────────────────── */

const TIER_LEVELS: Record<PlanTier, number> = {
  free: 0,
  starter: 1,
  professional: 2,
  enterprise: 3,
};

/**
 * Check if a subscription has access to a given tier's features.
 */
export function hasAccessToTier(subscription: Subscription, requiredTier: PlanTier): boolean {
  if (subscription.status !== "active" && subscription.status !== "trialing") {
    // Past-due gets a grace period — still active for now
    if (subscription.status === "past_due") {
      return TIER_LEVELS[subscription.planTier] >= TIER_LEVELS[requiredTier];
    }
    return requiredTier === "free";
  }
  return TIER_LEVELS[subscription.planTier] >= TIER_LEVELS[requiredTier];
}

/**
 * Check if a subscription is in a billable state (has an active payment).
 */
export function isSubscriptionActive(subscription: Subscription): boolean {
  return (
    subscription.status === "active" ||
    subscription.status === "trialing" ||
    subscription.status === "past_due"
  );
}

/**
 * Check if premium features should be revoked.
 */
export function shouldRevokeAccess(subscription: Subscription): boolean {
  return subscription.status === "canceled" || subscription.status === "incomplete";
}

/**
 * Get the default subscription for a user without a paid plan.
 */
export function getDefaultSubscription(userId: string): Subscription {
  const now = new Date().toISOString();
  return {
    id: `free-${userId}`,
    userId,
    stripeSubscriptionId: null,
    stripeCustomerId: null,
    planTier: "free",
    status: "active",
    currentPeriodStart: null,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Map a Stripe subscription status string to our domain status.
 */
export function mapStripeStatus(stripeStatus: string): SubscriptionStatus {
  switch (stripeStatus) {
    case "active":
      return "active";
    case "past_due":
      return "past_due";
    case "canceled":
    case "unpaid":
      return "canceled";
    case "trialing":
      return "trialing";
    case "incomplete":
    case "incomplete_expired":
      return "incomplete";
    default:
      return "none";
  }
}

/**
 * Determine which plan tier a Stripe price ID corresponds to.
 */
export function planTierFromPriceId(priceId: string): PlanTier {
  for (const plan of Object.values(PLANS)) {
    if (plan.stripePriceId === priceId) {
      return plan.tier;
    }
  }
  return "free";
}
