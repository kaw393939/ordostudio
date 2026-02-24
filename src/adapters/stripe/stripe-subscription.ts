/**
 * Stripe subscription adapter extensions.
 *
 * Adds customer management and subscription operations to the
 * existing Stripe client infrastructure. These functions extend
 * src/adapters/stripe/stripe-client.ts without modifying it.
 */

import Stripe from "stripe";

const requireSecretKey = (): string => {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || key.trim().length === 0) {
    throw new Error("stripe_secret_key_missing");
  }
  return key;
};

const stripeClient = (): Stripe => new Stripe(requireSecretKey());

/* ── Customer management ─────────────────────────────── */

export type StripeCustomer = {
  id: string;
  email: string | null;
};

export const createCustomer = async (input: {
  email: string;
  name?: string;
  metadata?: Record<string, string>;
}): Promise<StripeCustomer> => {
  const stripe = stripeClient();

  const customer = await stripe.customers.create({
    email: input.email,
    name: input.name,
    metadata: input.metadata,
  });

  return {
    id: customer.id,
    email: customer.email,
  };
};

export const retrieveCustomer = async (
  customerId: string,
): Promise<StripeCustomer | null> => {
  const stripe = stripeClient();

  try {
    const customer = await stripe.customers.retrieve(customerId);
    if ((customer as Stripe.DeletedCustomer).deleted) return null;
    const c = customer as Stripe.Customer;
    return { id: c.id, email: c.email };
  } catch {
    return null;
  }
};

/* ── Subscription management ─────────────────────────── */

export type StripeSubscriptionResult = {
  id: string;
  status: string;
  currentPeriodStart: number;
  currentPeriodEnd: number;
  cancelAtPeriodEnd: boolean;
};

export const createSubscription = async (input: {
  customerId: string;
  priceId: string;
  trialPeriodDays?: number;
}): Promise<StripeSubscriptionResult> => {
  const stripe = stripeClient();

  const subscription = await stripe.subscriptions.create({
    customer: input.customerId,
    items: [{ price: input.priceId }],
    trial_period_days: input.trialPeriodDays,
  });

  // In Stripe v20 period dates live on items, not the subscription itself
  const firstItem = subscription.items?.data?.[0];
  return {
    id: subscription.id,
    status: subscription.status,
    currentPeriodStart: firstItem?.current_period_start ?? 0,
    currentPeriodEnd: firstItem?.current_period_end ?? 0,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
  };
};

export const cancelSubscription = async (
  subscriptionId: string,
  cancelAtPeriodEnd = true,
): Promise<StripeSubscriptionResult> => {
  const stripe = stripeClient();

  const subscription = await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: cancelAtPeriodEnd,
  });

  const firstItem = subscription.items?.data?.[0];
  return {
    id: subscription.id,
    status: subscription.status,
    currentPeriodStart: firstItem?.current_period_start ?? 0,
    currentPeriodEnd: firstItem?.current_period_end ?? 0,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
  };
};

/* ── Customer Portal ─────────────────────────────────── */

export const createBillingPortalSession = async (input: {
  customerId: string;
  returnUrl: string;
}): Promise<{ url: string }> => {
  const stripe = stripeClient();

  const session = await stripe.billingPortal.sessions.create({
    customer: input.customerId,
    return_url: input.returnUrl,
  });

  return { url: session.url };
};
