/**
 * Subscription webhook event handlers.
 *
 * Processes Stripe subscription lifecycle events and updates
 * local subscription state and user entitlements accordingly.
 */

import { mapStripeStatus, planTierFromPriceId } from "@/lib/subscriptions";
import type { SubscriptionStatus, PlanTier } from "@/lib/subscriptions";

/* ── Webhook event types we handle ───────────────────── */

export const SUBSCRIPTION_WEBHOOK_EVENTS = [
  "invoice.payment_succeeded",
  "invoice.payment_failed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
] as const;

export type SubscriptionWebhookEventType = (typeof SUBSCRIPTION_WEBHOOK_EVENTS)[number];

export function isSubscriptionEvent(eventType: string): eventType is SubscriptionWebhookEventType {
  return (SUBSCRIPTION_WEBHOOK_EVENTS as readonly string[]).includes(eventType);
}

/* ── Normalised event payload ────────────────────────── */

export type SubscriptionWebhookResult = {
  handled: boolean;
  action: string;
  userId?: string;
  status?: SubscriptionStatus;
  planTier?: PlanTier;
};

/**
 * Process a subscription-related webhook event.
 *
 * Stub implementation: extracts intent from event type and returns
 * the action that would be taken. In production this writes to the
 * subscriptions table and triggers entitlement updates.
 */
export function processSubscriptionWebhook(
  eventType: string,
  eventData: Record<string, unknown>,
): SubscriptionWebhookResult {
  if (!isSubscriptionEvent(eventType)) {
    return { handled: false, action: "ignored" };
  }

  switch (eventType) {
    case "invoice.payment_succeeded": {
      const subscriptionId = (eventData.subscription as string) ?? null;
      return {
        handled: true,
        action: "payment_confirmed",
        status: "active",
        userId: subscriptionId ? `sub:${subscriptionId}` : undefined,
      };
    }

    case "invoice.payment_failed": {
      const subscriptionId = (eventData.subscription as string) ?? null;
      return {
        handled: true,
        action: "payment_failed",
        status: "past_due",
        userId: subscriptionId ? `sub:${subscriptionId}` : undefined,
      };
    }

    case "customer.subscription.created": {
      const status = mapStripeStatus((eventData.status as string) ?? "");
      const priceId = extractPriceId(eventData);
      const planTier = priceId ? planTierFromPriceId(priceId) : "free";
      return {
        handled: true,
        action: "subscription_created",
        status,
        planTier,
      };
    }

    case "customer.subscription.updated": {
      const status = mapStripeStatus((eventData.status as string) ?? "");
      const priceId = extractPriceId(eventData);
      const planTier = priceId ? planTierFromPriceId(priceId) : undefined;
      return {
        handled: true,
        action: "subscription_updated",
        status,
        planTier,
      };
    }

    case "customer.subscription.deleted": {
      return {
        handled: true,
        action: "subscription_canceled",
        status: "canceled",
      };
    }

    default:
      return { handled: false, action: "ignored" };
  }
}

/* ── helpers ────────────────────────────────────────── */

function extractPriceId(eventData: Record<string, unknown>): string | null {
  const items = eventData.items as { data?: Array<{ price?: { id?: string } }> } | undefined;
  return items?.data?.[0]?.price?.id ?? null;
}
