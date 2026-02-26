/**
 * Subscription webhook event handlers.
 *
 * STUB — not yet DB-backed.
 *
 * This module recognises the relevant Stripe subscription event types and
 * extracts their intent.  It does NOT yet write to the `subscriptions` table
 * or trigger entitlement updates.
 *
 * All recognised events return `handled: false` to signal to callers that no
 * persistent state was changed.  A caller that marks these events PROCESSED
 * based on `handled: true` would silently swallow subscription lifecycle changes.
 *
 * TODO: implement DB writes for each event case before integrating this module
 * into the Stripe webhook pipeline.
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
 * STUB: returns intent metadata but does NOT write to the DB.
 * All recognised events return `handled: false` to prevent callers from
 * incorrectly marking events as fully processed.
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
        handled: false,
        action: "not_implemented:payment_confirmed",
        status: "active",
        userId: subscriptionId ? `sub:${subscriptionId}` : undefined,
      };
    }

    case "invoice.payment_failed": {
      const subscriptionId = (eventData.subscription as string) ?? null;
      return {
        handled: false,
        action: "not_implemented:payment_failed",
        status: "past_due",
        userId: subscriptionId ? `sub:${subscriptionId}` : undefined,
      };
    }

    case "customer.subscription.created": {
      const status = mapStripeStatus((eventData.status as string) ?? "");
      const priceId = extractPriceId(eventData);
      const planTier = priceId ? planTierFromPriceId(priceId) : "free";
      return {
        handled: false,
        action: "not_implemented:subscription_created",
        status,
        planTier,
      };
    }

    case "customer.subscription.updated": {
      const status = mapStripeStatus((eventData.status as string) ?? "");
      const priceId = extractPriceId(eventData);
      const planTier = priceId ? planTierFromPriceId(priceId) : undefined;
      return {
        handled: false,
        action: "not_implemented:subscription_updated",
        status,
        planTier,
      };
    }

    case "customer.subscription.deleted": {
      return {
        handled: false,
        action: "not_implemented:subscription_canceled",
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
