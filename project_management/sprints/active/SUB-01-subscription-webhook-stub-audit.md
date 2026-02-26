# SUB-01 — Subscription Webhook Stub Audit + Comprehensive Test Suite

**Area:** `src/lib/subscription-webhooks.ts`, `src/lib/subscriptions.ts`
**Severity:** Low (correctness; functional gap not a data corruption risk)
**Category:** Uncle Bob — "stub shipping as feature"

---

## Problem — `processSubscriptionWebhook` is a pure stub

The function has no side effects and returns metadata about what "would"
happen rather than doing it.  Notable signals:

1. `userId` is populated as `` `sub:${subscriptionId}` `` — a Stripe
   subscription ID, never a local user ID.
2. No DB writes; no entitlement updates.
3. Returns `handled: true` for events it doesn't implement, misleading the
   caller into believing the event was processed.

```ts
case "invoice.payment_succeeded": {
  return {
    handled: true,
    action: "payment_confirmed",
    status: "active",
    userId: `sub:${subscriptionId}`,   // Stripe ID, not a user ID
  };
}
```

Production effect: subscription lifecycle events (renewals, failures,
cancellations) return `handled: true` but never update the `subscriptions`
table or entitlements.  If `isSubscriptionEvent` returns `true`, the Stripe
webhook handler considers the event processed and marks it `PROCESSED` in
`stripe_webhook_events`.  These events are never replayed.

---

## Fix Strategy

This sprint does **not** fully implement subscription management (that
requires a broader design decision).  Instead:

1. **Document the stub** — add a clear `// STUB: not yet DB-backed` header
   and change `handled: true` → `handled: false` for events that don't yet
   have real implementations.  This prevents the webhook handler from
   silently swallowing unimplemented events.

2. **Comprehensive test suite** — cover all 5 handled event types plus:
   - Unknown event type → `{ handled: false }`
   - Subscription ID absent → graceful
   - `extractPriceId` with malformed `items` structure → null (no throw)
   - `isSubscriptionEvent` type guard

3. **Explicit TODO test** — one test asserting that `handled: false` (stub)
   prompts the webhook layer to fall through to a `not_implemented` log
   rather than marking the event PROCESSED.

---

## Deliverables

- [ ] `processSubscriptionWebhook`: change all `handled: true` stub returns to
      `handled: false` with `action: "not_implemented_stub"` until DB writes exist
- [ ] Add `// STUB` header comment with link to follow-up task
- [ ] `src/lib/__tests__/subscription-webhooks.test.ts` — 12+ test cases
      covering all event types, edge cases, `isSubscriptionEvent`, `extractPriceId`
- [ ] All existing tests pass

---

## Acceptance Criteria

1. A call to `processSubscriptionWebhook("invoice.payment_succeeded", {...})`
   returns `{ handled: false }` (stub), not `handled: true`.
2. `isSubscriptionEvent("customer.subscription.deleted")` → `true`
3. `isSubscriptionEvent("charge.failed")` → `false`
4. `extractPriceId` with `items.data = []` → `null` (no throw)
