# Sprint Eval-01: Policy Enforcement Eval Suite — Scenario Specs

All scenarios defined in `src/evals/policy-suite.eval.ts`.

---

## PE-01: `self-referral-blocked`

**Enforced in:** `src/app/api/v1/referral/click/route.ts` (or wherever click is recorded)

```typescript
{
  id: "policy-PE-01-self-referral",
  type: "policy",
  description: "User cannot get credit for clicking their own referral link",
  preSetup: (db) => {
    db.prepare(`INSERT OR IGNORE INTO users (id,email,role) VALUES ('u-self','self@test.com','SUBSCRIBER')`).run();
    db.prepare(`INSERT OR IGNORE INTO referrals (id,user_id,referral_code) VALUES ('ref-self','u-self','SELF001')`).run();
  },
  action: {
    type: "http",
    method: "POST",
    path: "/api/v1/referral/click",
    headers: { "x-user-id": "u-self" },      // caller IS the referral owner
    body: { referralCode: "SELF001" },
  },
  assertions: [
    { type: "http-status", expected: 400 },
    { type: "response-contains", key: "error", value: "SELF_REFERRAL_NOT_ALLOWED" },
    { type: "db-row-not-exists",
      sql: "SELECT id FROM referral_conversions WHERE referral_id='ref-self' AND conversion_type='CLICK'"
    },
  ],
},
```

---

## PE-02: `double-booking-blocked`

**Enforced in:** `add_availability_slot` tool / booking DB layer

```typescript
{
  id: "policy-PE-02-double-booking",
  type: "policy",
  description: "Second booking for same slot is blocked by DB transaction guard",
  preSetup: (db) => {
    db.prepare(`INSERT OR IGNORE INTO users (id,email,role) VALUES ('u-book1','b1@test.com','SUBSCRIBER'),('u-book2','b2@test.com','SUBSCRIBER')`).run();
    db.prepare(`INSERT OR IGNORE INTO availability_slots (id,start_at,end_at,capacity,booked_n) VALUES ('slot-1',datetime('now','+1 day'),datetime('now','+1 day','+1 hour'),1,0)`).run();
  },
  action: {
    type: "db-call",
    fn: (db) => {
      // First booking should succeed
      bookSlot(db, "slot-1", "u-book1");
      // Second booking should fail (capacity=1, booked_n would become 2)
      return bookSlot(db, "slot-1", "u-book2");  // expect throw
    },
  },
  assertions: [
    { type: "throws-with-code", code: "SLOT_CAPACITY_EXCEEDED" },
    { type: "db-row-exists",
      sql: "SELECT id FROM availability_slots WHERE id='slot-1' AND booked_n=1"
    },
  ],
},
```

---

## PE-03: `apprentice-scope-403`

**Enforced in:** ADMIN-only route middleware

```typescript
{
  id: "policy-PE-03-apprentice-403",
  type: "policy",
  description: "APPRENTICE role calling admin-only route gets 403",
  action: {
    type: "http",
    method: "GET",
    path: "/api/v1/admin/ops-summary",
    headers: { "x-user-id": "u-appr-1", "x-user-role": "APPRENTICE" },
  },
  assertions: [
    { type: "http-status", expected: 403 },
  ],
},
```

---

## PE-04: `commission-void-on-refund`

**Enforced in:** Stripe webhook handler

```typescript
{
  id: "policy-PE-04-commission-void-refund",
  type: "policy",
  description: "Stripe refund webhook voids linked commission",
  preSetup: (db) => {
    db.prepare(`INSERT OR IGNORE INTO commissions (id,referral_id,user_id,amount,status,stripe_payment_intent_id) VALUES ('com-wh-1','ref-1','u-aff-1',40,'pending','pi_test_001')`).run();
  },
  action: {
    type: "webhook",
    event: "charge.refunded",
    payload: { payment_intent: "pi_test_001", amount_refunded: 4000 },
  },
  assertions: [
    { type: "db-row-exists",
      sql: "SELECT id FROM commissions WHERE id='com-wh-1' AND status='voided'"
    },
  ],
},
```

> **Note:** `commissions` table may need `stripe_payment_intent_id` column. Add to
> Maestro-00b migration if not present, or add a targeted migration 048 here.

---

## PE-05: `role-self-approve-blocked`

**Enforced in:** `approve_role_request` tool / route

```typescript
{
  id: "policy-PE-05-role-self-approve",
  type: "policy",
  description: "User cannot approve their own role upgrade request",
  preSetup: (db) => {
    db.prepare(`INSERT OR IGNORE INTO users (id,email,role) VALUES ('u-staffer','staff@test.com','STAFF')`).run();
    db.prepare(`INSERT OR IGNORE INTO role_requests (id,user_id,requested_role,status) VALUES ('rr-self','u-staffer','ADMIN','pending')`).run();
  },
  action: {
    type: "tool-call",
    toolName: "approve_role_request",
    args: { requestId: "rr-self" },
    callerId: "u-staffer",    // same user who made the request
    callerRole: "STAFF",
  },
  assertions: [
    { type: "throws-with-code", code: "CANNOT_APPROVE_OWN_REQUEST" },
    { type: "db-row-exists",
      sql: "SELECT id FROM role_requests WHERE id='rr-self' AND status='pending'"
    },
  ],
},
```

---

## PE-06: `intake-visibility-unauthorized`

**Enforced in:** `GET /api/v1/intake/:id` route auth middleware

```typescript
{
  id: "policy-PE-06-intake-unauth",
  type: "policy",
  description: "Unauthenticated call to intake detail returns 401",
  action: {
    type: "http",
    method: "GET",
    path: "/api/v1/intake/any-intake-id",
    // No auth headers
  },
  assertions: [
    { type: "http-status", expected: 401 },
  ],
},
```
