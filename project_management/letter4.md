Here’s a comprehensive **positive + negative E2E test inventory** for everything that’s web-accessible today (UI + HTTP API), plus a set of **missing “complete app” features** and the E2E tests you’d add if you decide to ship them.

I’m assuming you’ll run these with Playwright (as implied by the UI hardening sprint). 

---

## Test data setup you should standardize (so E2E is deterministic)

Create fixtures/seeds for E2E that always include:

* Users: `userA` (USER), `adminA` (ADMIN), optionally `staffA` if you have STAFF flows.
* Events:

  1. `published-open` (PUBLISHED, capacity available)
  2. `published-full` (PUBLISHED, capacity full)
  3. `draft-event` (DRAFT, admin-visible)
  4. `cancelled-event` (CANCELLED, read-only)
* Registrations:

  * `userA` registered for `published-open` (REGISTERED)
  * `published-full` already at capacity so new adds become WAITLISTED
    This aligns with the domain transitions and UI expectations in the events + registration sprints.   

---

# A) E2E tests for CURRENT FEATURES

## 1) API foundation & contracts (smoke + regression)

These validate the API is “UI consumable” and stable.

### Positive

1. **API root is discoverable**

   * `GET /api/v1` returns `application/hal+json` and contains `_links.self` + navigation links. 
2. **Docs endpoint exists**

   * `GET /api/v1/docs` returns OpenAPI skeleton (or real spec) with 200. 
3. **Request correlation present**

   * Trigger any known error and verify `request_id` is returned (header + body extension on Problem Details). 

### Negative

4. **Problem Details contract always used**

   * Call a missing endpoint → verify `application/problem+json` with `type/title/status/detail/instance` and `request_id`. 
5. **Content-type correctness**

   * Ensure success responses are `application/hal+json` and errors are `application/problem+json` across representative endpoints. 

---

## 2) Auth & session (web)

These map directly to `/register`, `/login`, `/logout`, `/account`, and the underlying auth endpoints.

### Positive

1. **Register → login session established**

   * UI: `/register` create account → redirect / navigate to authenticated state → `/account` accessible. 
2. **Login sets session**

   * UI: `/login` valid creds → `/account` loads and shows `/api/v1/me` info.  
3. **Logout clears session**

   * UI: logout → `/account` becomes gated and redirects/blocks. 
4. **Role-aware affordances**

   * `GET /api/v1/me` returns role-aware HAL links (admin sees admin affordances). 

### Negative

5. **Invalid credentials**

   * UI login with wrong password → renders Problem Details (friendly) and displays `request_id`. 
6. **Rate limited login/register**

   * Rapid-fire login/register attempts → 429 surfaced with friendly UI + request_id.  
7. **CSRF-safe mutation behavior**

   * Attempt cross-site/invalid CSRF mutation pattern (where applicable) → blocked; UI shows Problem Details. 
8. **Session expiry behavior**

   * Simulate expired session (clear cookie) → `/account` gated; admin pages gated. 

---

## 3) Public events browsing (anonymous + logged-in)

### Positive

1. **Events list renders**

   * `/events` loads from API, supports paging/filter controls (as implemented). 
2. **Event detail renders**

   * `/events/[slug]` loads and shows event info and state. 

### Negative

3. **Non-existent event slug**

   * `/events/bad-slug` → show 404-like UX via Problem Details renderer + request_id.  
4. **API failure surfaced cleanly**

   * Force API 500 (or intercept) → UI shows consistent error and request_id. 

---

## 4) HATEOAS compliance in UI (critical)

These ensure the UI truly follows HAL `_links`, not hardcoded endpoints.

### Positive

1. **Admin publish/cancel controls only appear when links exist**

   * Admin opens DRAFT event: Publish button visible.
   * Admin opens PUBLISHED event: Cancel visible.
   * Admin opens CANCELLED event: neither visible.  
2. **UI performs actions via the HAL href**

   * Intercept the HAL response and modify the publish/cancel link href (test server or Playwright route) → verify UI posts to that href (not the default path). This is the strongest “HATEOAS proof.”  

### Negative

3. **Affordance removed ⇒ action blocked**

   * Return an event without `app:publish` link → publish action must not be possible (no button; no request). 
4. **Stale UI (race)**

   * Publish in one tab; other tab still shows publish button → next click should fail gracefully (Problem Details), refresh state, remove button. 

---

## 5) User registration UX on event detail

### Positive

1. **Register for open event ⇒ REGISTERED**

   * User registers on `published-open` → shows REGISTERED badge/state. 
2. **Register for full event ⇒ WAITLISTED**

   * User registers on `published-full` → shows WAITLISTED.  
3. **Cancel registration**

   * Cancel action transitions to CANCELLED state (no hard delete).  

### Negative

4. **Duplicate registration attempt**

   * Try registering twice → conflict or “already registered” UX; no duplicate state created. 
5. **Register while logged out**

   * Attempt register action → redirected to login or blocked with message. 
6. **Cancel when not registered**

   * UI should hide cancel or show controlled error. 

---

## 6) Admin events console

### Positive

1. **Admin access gate**

   * Non-admin visits `/admin/events` → blocked/redirected.  
2. **Create event**

   * Valid create form → new DRAFT event appears in list. 
3. **Edit event**

   * Update title/time/capacity → persists and reflected on reload. 
4. **Publish event (idempotent)**

   * Publish once succeeds; publish again either hidden (link removed) or safe. 
5. **Cancel event with reason**

   * Cancel requires reason; status changes to CANCELLED. 

### Negative

6. **Create validation errors**

   * Missing fields/invalid ISO times → Problem Details field errors displayed. 
7. **Slug conflict**

   * Create event with existing slug → conflict error displayed. 
8. **Cancel without reason**

   * Should fail and show validation error. 

---

## 7) Admin registrations, check-in, export

### Positive

1. **Registrations list loads**

   * `/admin/events/[slug]/registrations` shows current registrations + statuses. 
2. **Admin adds registration**

   * Add user to event; if full ⇒ WAITLISTED.  
3. **Admin cancels registration (soft)**

   * Cancel sets CANCELLED, history retained. 
4. **Check-in allowed transitions**

   * Check-in changes to CHECKED_IN from allowed states. 
5. **Export CSV/JSON**

   * Export from `/admin/events/[slug]/export` succeeds for csv/json formats.  
6. **Request IDs visible on blocked export**

   * Trigger a blocked include_email case; verify Problem Details + request_id shown in UI.  

### Negative

7. **Check-in invalid state**

   * Attempt check-in for CANCELLED (or disallowed) → blocked with Problem Details. 
8. **Export include_email governance**

   * Outside local or without token/permission, include_email must be denied; UI displays governance error.  
9. **Export rate limiting**

   * Rapid export requests trigger 429 and UI handles it. 
10. **Add registration for unknown user**

* Should fail with not-found Problem Details. 

---

## 8) Admin users UI (non-escalation)

### Positive

1. **Users list/search/filter**

   * `/admin/users` loads list; search works. 
2. **Enable/disable user**

   * Disable a user, verify they can’t log in; enable restores.  
3. **Add/remove ADMIN role (idempotent)**

   * Add role twice: second is no-op; remove twice: second no-op. 

### Negative

4. **No SUPER_ADMIN escalation in UI**

   * Confirm no UI control exists to add/remove SUPER_ADMIN. 
5. **Attempt SUPER_ADMIN escalation via API denied**

   * Direct API request as admin tries to grant SUPER_ADMIN → denied. 
6. **Unauthorized access**

   * USER tries `/admin/users` directly → gated/redirected. 

---

## 9) Security + hardening behaviors (UI-visible)

### Positive

1. **Handler-level auth enforcement**

   * Try accessing admin mutation endpoints without session → 401/403 with Problem Details. 
2. **No-store caching on auth/user endpoints**

   * Verify `Cache-Control: no-store` on `/api/v1/me` and auth endpoints (helps prevent leakage). 

### Negative

3. **Rate limiting behavior visible**

   * Login/register/export 429 surfaced in UI without crashes. 
4. **Escalation-surface check**

   * Confirm UI does not expose CLI-only dangerous ops (db backup/restore, token issuance).   

---

## 10) “Release gate” journeys (the big end-to-end paths)

These are the journeys Sprint 20 calls out as required for release. 

### Positive

1. **Public journey**

   * Browse `/events` → open detail → register → see status → cancel → see CANCELLED. 
2. **Admin journey**

   * Admin create event → publish → add registration → check-in → export. 
3. **Supportability**

   * Force an API error anywhere in journey and verify UI shows `request_id`.  

### Negative

4. **Regression journey: role downgrade mid-session**

   * Admin loses role (via API/fixture) and refreshes admin page → must lose access immediately. 

---

# B) “Missing features” for a truly complete event app (and the E2E tests they imply)

Your current system is already a coherent “MVP event platform” (auth, RBAC, events, registrations, check-in, export). What’s *commonly required* for a “complete application” depends on your target (internal events vs public production). Below are the typical gaps and their test inventories.

## 1) Password reset / account recovery (missing)

**Why it matters:** Without it, users who forget passwords are stuck.

### E2E tests

* Positive: request reset → receive token/link (test inbox or token capture) → set new password → login works.
* Negative: expired token, reused token, invalid email, rate-limited reset requests.

## 2) Email verification (optional but common)

**Why it matters:** Prevents fake signups and improves deliverability.

### E2E tests

* Positive: register → verification required → verify link → account becomes ACTIVE.
* Negative: unverified user cannot register for events; expired verification link; resend verification rate limit.

## 3) Admin invitation flows (missing)

Right now admins are managed via admin UI/CLI rules (and SUPER_ADMIN is blocked in UI).  
For a “complete app,” you often need an “invite admin” flow (without opening escalation holes).

### E2E tests

* Positive: admin sends invite → invited user accepts → gains ADMIN (not SUPER_ADMIN).
* Negative: invite reuse, invite expiry, invite sent to existing account, unauthorized invite attempt.

## 4) User “My registrations” / receipts / confirmations (partial)

Sprint 15 mentions `/account` and a “basic registration summary.” 
If you want completeness, formalize it.

### E2E tests

* Positive: user sees all registrations across events; status updates live after cancel/check-in.
* Negative: privacy—user cannot see other users’ registrations.

## 5) Event discovery quality (search, tags, calendar)

Not required, but often expected.

### E2E tests

* Search by title/location/tags (if added), filters persist in URL, pagination stable.
* Calendar export (ICS) if you add it: link downloads valid ICS; timezones correct.

## 6) Audit log UI (missing, but “enterprise complete”)

You already rely on audit for fail-closed mutations at the domain level.  
If you want a complete admin experience, add an audit viewer.

### E2E tests

* Positive: admin views audit entries for publish/cancel/export, filters by actor/action.
* Negative: non-admin cannot access; PII redaction in audit metadata as needed.

## 7) Compliance basics (Terms/Privacy, data retention)

Often needed for real public use.

### E2E tests

* Terms/privacy pages accessible; registration requires checkbox acknowledgement (if implemented).
* Data export retention rules, and “delete account” flow (if you add it).

---

# Minimal “E2E completeness checklist” (if you want to call this “done”)

If you implement E2E for all items in section A, you will cover:

* Auth/session lifecycle + hardening behaviors  
* Public events browse/detail + HAL-driven affordances  
* Registration transitions (REGISTERED/WAITLISTED/CANCELLED/CHECKED_IN)  
* Admin event lifecycle and admin operations  
* Non-escalation and CLI-only boundaries   

If you also add the “missing” features in section B, you’ll be closer to a fully public “complete app” rather than a tight MVP.

If you want, I can turn this list into a **test plan artifact** with: IDs, prerequisites (seed state), steps, and expected results (including the exact Problem Details fields you should assert).
