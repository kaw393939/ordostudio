# Sprint 33: Activity Feed — Sprint Plan

## 1. Tasks

### T1: Extend `FeedItem` Type and `aggregateFeed` Function
- **File:** `src/lib/api/feed.ts`
- **Action:** Add new types to the `FeedItem` union and update `aggregateFeed` args:

  ```ts
  export interface FeedItem {
    id: string;
    type:
      | "AccountRegistration"
      | "EngagementTimelineItem"
      | "FollowUpAction"
      | "OnboardingProgress"
      | "SubscriptionEvent"
      | "TriageTicket"
      | "RoleRequestUpdate"   // NEW
      | "ReferralActivity"    // NEW
      | "PayoutStatus";       // NEW
    timestamp: string;
    title: string;
    description: string;
    actionUrl?: string;
  }
  ```

  Add to `AggregateFeedArgs`:
  ```ts
  export interface AggregateFeedArgs {
    registrations: UserRegistrationHistoryReadRow[];
    timelineItems: MyEngagementTimelineItem[];
    followUpActions: EngagementFollowUpAction[];
    feedEvents?: StoredFeedEvent[];      // NEW — from feed_events table
    payoutActionItem?: FeedItem | null;  // NEW — dynamically injected if affiliate + no payout
  }
  ```

  Add a `StoredFeedEvent` type (matches what the DB row looks like):
  ```ts
  export interface StoredFeedEvent {
    id: string;
    user_id: string;
    type: FeedItem["type"];
    title: string;
    description: string;
    action_url: string | null;
    created_at: string;
  }
  ```

  In `aggregateFeed()`, add:
  ```ts
  for (const event of data.feedEvents ?? []) {
    items.push({
      id: `feed-${event.id}`,
      type: event.type,
      timestamp: event.created_at,
      title: event.title,
      description: event.description,
      actionUrl: event.action_url ?? undefined,
    });
  }

  if (data.payoutActionItem) {
    items.push(data.payoutActionItem);
  }
  ```

---

### T2: Create `feed_events` Table Migration
- **File:** Add to DB schema / migration scripts (wherever `appendAuditLog` and `referral_codes` schema is defined — check `src/cli/db.ts` or equivalent)
- **Action:** Add a `feed_events` table:
  ```sql
  CREATE TABLE IF NOT EXISTS feed_events (
    id         TEXT PRIMARY KEY,
    user_id    TEXT NOT NULL,
    type       TEXT NOT NULL,
    title      TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    action_url TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
  CREATE INDEX IF NOT EXISTS idx_feed_events_user_id ON feed_events(user_id);
  ```
- **Action:** Add a `writeFeedEvent()` helper to a new `src/lib/api/feed-events.ts` (keep it separate from `src/lib/api/feed.ts` to avoid circular imports between the type definitions and the DB helpers):
  ```ts
  export const writeFeedEvent = (
    db: Database,
    input: { userId: string; type: FeedItem["type"]; title: string; description: string; actionUrl?: string }
  ): void => {
    const now = new Date().toISOString();
    db.prepare(
      "INSERT INTO feed_events (id, user_id, type, title, description, action_url, created_at) VALUES (?,?,?,?,?,?,?)"
    ).run(randomUUID(), input.userId, input.type, input.title, input.description, input.actionUrl ?? null, now);
  };

  export const listFeedEventsForUser = (db: Database, userId: string, limit = 50): StoredFeedEvent[] => {
    return db.prepare(
      "SELECT * FROM feed_events WHERE user_id = ? ORDER BY created_at DESC LIMIT ?"
    ).all(userId, limit) as StoredFeedEvent[];
  };
  ```

---

### T3: Write Feed Events on Role Request Status Change
- **File:** `src/app/api/v1/admin/role-requests/[id]/route.ts`
- **Action:** After `updateRoleRequestStatus()` succeeds, call `writeFeedEvent()` for the affected user:
  ```ts
  writeFeedEvent(db, {
    userId: updated.user_id,
    type: "RoleRequestUpdate",
    title: status === "APPROVED"
      ? `Your ${roleRow.name} application was approved.`
      : `Your ${roleRow.name} application was not approved.`,
    description: status === "APPROVED"
      ? "Welcome to the guild."
      : "Questions? Contact us at studio@studioordo.com",
  });
  ```
  The `db` instance is already opened on that route for the email query — reuse it.

- **Also:** When a role request is first SUBMITTED via the role request endpoint, write a `RoleRequestUpdate` event (type: `"RoleRequestUpdate"`, title: `"Application submitted — pending review."`) in `src/app/api/v1/account/role-requests/route.ts` POST handler. Check whether a POST handler exists — if not, check `src/app/api/v1/roles/request/route.ts`.

---

### T4: Write Feed Event on Referral Conversion
- **File:** `src/lib/api/referrals.ts` — inside `recordReferralConversionForIntake()`
- **Action:** After inserting into `referral_conversions`, call `writeFeedEvent()`:
  ```ts
  writeFeedEvent(db, {
    userId: referral.user_id,
    type: "ReferralActivity",
    title: `Referral converted.`,
    description: `Code ${referral.code} — a new lead came through your referral link. Commission pending engagement completion.`,
  });
  ```
  The `db` instance and `referral` record are already available in that function.

---

### T5: Write Feed Event When Stripe Connect Becomes Active
- **File:** `src/lib/api/stripe-connect.ts` — inside `refreshStripeConnectAccountForUser()`
- **Action:** After writing the refreshed account status to DB, check for a `payouts_enabled` transition:
  ```ts
  const wasEnabled = existing?.payouts_enabled;
  const nowEnabled = updatedAccount.payouts_enabled;
  if (!wasEnabled && nowEnabled) {
    writeFeedEvent(db, {
      userId: input.userId,
      type: "PayoutStatus",
      title: "Payout account active.",
      description: "Commissions will be sent automatically when deals close.",
    });
  }
  ```
  This fires only once — on the first time `payouts_enabled` transitions from falsy → true.

---

### T6: Inject "Activate Payout" Item Dynamically in Feed Route
- **File:** `src/app/api/v1/me/feed/route.ts`
- **Action:** After loading the user, check if they are AFFILIATE and Stripe Connect is not yet active:
  ```ts
  import { getStripeConnectAccountForUser } from "@/lib/api/stripe-connect";
  import { listFeedEventsForUser } from "@/lib/api/feed-events";

  // Inside _GET:
  const feedEvents = listFeedEventsForUser(db, user.id);

  let payoutActionItem: FeedItem | null = null;
  if (user.roles.includes("AFFILIATE")) {
    const stripeAccount = getStripeConnectAccountForUser(user.id);
    if (!stripeAccount || !stripeAccount.payouts_enabled) {
      payoutActionItem = {
        id: "payout-activation-required",
        type: "FollowUpAction",
        timestamp: new Date().toISOString(),
        title: "Activate your payout account.",
        description: "Set up payouts to receive commissions when deals close.",
        actionUrl: "/account",
      };
    }
  }

  const allFeedItems = aggregateFeed(
    { registrations, timelineItems, followUpActions, feedEvents, payoutActionItem },
    { type }
  );
  ```

---

### T7: Add `ReferralCard` to Dashboard
- **File:** `src/app/(public)/dashboard/page.tsx`
- **Action:** Import `ReferralCard` and render it below the `ActionFeed` card for all authenticated users:
  ```tsx
  import { ReferralCard } from "./referral-card";

  // Inside the `me ? (...)` block, after the ActionFeed Card:
  <div className="mt-4">
    <ReferralCard />
  </div>
  ```
  Update the `url` returned from `/api/v1/account/referral` from `/r/${code}` to `/card?ref=${code}` (this is what Sprint 26/31 fixes, but confirm the API returns the correct URL before this sprint closes).

---

### T8: Write Tests
- **File:** Create `src/app/__tests__/e2e-feed-guild-events.test.ts`
- **Tests to write:**

  **Test 1: Role request submission creates feed item**
  - Submit a role request → call `/api/v1/me/feed` → assert item with `type === "RoleRequestUpdate"` and title containing `"pending review"` appears.

  **Test 2: Role request approval creates feed item**
  - Submit role request → admin approves → call `/api/v1/me/feed` → assert item with `type === "RoleRequestUpdate"` and title containing `"approved"` appears.

  **Test 3: Affiliate approval creates "activate payout" action item**
  - Register user → admin approves AFFILIATE role → user has no Stripe Connect → call `/api/v1/me/feed` → assert item with `type === "FollowUpAction"` and title `"Activate your payout account."` appears.

  **Test 4: Payout action item disappears when payouts enabled**
  - Same setup → mock/set Stripe Connect `payouts_enabled = true` in DB → call feed → assert NO `"Activate your payout account."` item in response.

  **Test 5: Referral conversion creates feed event for code owner**
  - Create user with referral code → submit intake with `so_ref` cookie → call `/api/v1/me/feed` for the code owner → assert item with `type === "ReferralActivity"` appears.

  **Test 6: Referral conversion feed item contains NO lead PII**
  - Same as Test 5 → assert feed item body does not contain the lead's email or name.

  **Test 7: Payout-active feed item appears after Stripe Connect activates**
  - Set up scenario where `payouts_enabled` transitions to true → assert `PayoutStatus` feed item appears.

---

### T9: Verify + Build
  1. `npx vitest run` — all new tests pass, no existing tests broken.
  2. `npm run build` — no errors.
  3. Manual: submit a role request → check dashboard feed → item appears.
  4. Manual: as admin, approve the role request → check the user's feed → approval item appears.
  5. Manual: log in as affiliate with no Stripe Connect → check feed → "Activate your payout account." item visible.
  6. Manual: dashboard shows `ReferralCard` with QR code for freshly registered user.

---

## 2. Dependency Graph

```
T1 (extend FeedItem type)
T2 (feed_events table + helpers)
          │
          ├──► T3 (role request status → feed event)
          ├──► T4 (referral conversion → feed event)
          ├──► T5 (stripe connect activation → feed event)
          └──► T6 (inject payout action in feed route)
          │
          ▼
T7 (ReferralCard on dashboard — independent)
T8 (tests — depends on T3, T4, T5, T6)
          │
          ▼
     T9 (verify + build)
```

**Upstream note:** T6 updates `/api/v1/account/referral` return value. Check if Sprint 26 or Sprint 31 have already updated the URL. If so, T6 is verification only for the URL portion.
