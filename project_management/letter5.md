Yep — then we treat **usability as Sprint 33+**, and we write it like product-quality increments (Krug: “don’t make me think”; Rauch: “fast, resilient, great defaults, leverage the platform”).

Here’s a **clean Sprint 33–40 plan** that targets the biggest usability pain first, while staying aligned with your HAL/HATEOAS contract and Next.js App Router architecture.

---

## Sprint 33 — “Obviousness Pass” (Navigation, layout, and clarity)

**Goal:** Users always know **where they are**, **what they can do next**, and **why something is blocked**.

**Changes**

* Hard separation of **Public** vs **Admin** experiences:

  * Route groups + distinct layouts (`/(public)` vs `/(admin)`)
  * Admin shell uses a console layout; public uses a lightweight site layout
* Add global **breadcrumb** patterns on detail pages (public + admin)
* Add **role badge** and **environment badge** in admin header (“Admin”, “Local/Prod”) to reduce confusion around permissions/export governance
* Add `loading.tsx` skeletons and `error.tsx` boundaries at every major route segment (no blank screens, no full-app crashes)

**Acceptance criteria**

* A first-time user can answer in <5 seconds: “Am I in Admin or Public?”
* No page shows a blank screen during data fetch; skeletons appear immediately
* Errors are contained per page; the app shell remains usable

---

## Sprint 34 — Events Discovery Upgrade (Findability)

**Goal:** Make it *easy* to locate an event without scrolling or guessing.

**Changes**

* `/events` and `/admin/events` get:

  * Search (title/slug)
  * Sort (date, status)
  * Filters (status tabs in admin: Draft / Published / Cancelled; public default: Upcoming)
  * URL-synced state (filters and page persist in the URL for shareable links)
* Better empty states:

  * “No events match filters” + “Clear filters” CTA
* Row “preview” interactions (hover/expand) to avoid needless navigation

**Suggested libs**

* **TanStack Table** for serious filtering/sorting/pagination on admin lists (works well with shadcn primitives)

**Acceptance criteria**

* You can find any event in ≤2 interactions (search or filter+click)
* Copy-pasting the URL reproduces the same list view

---

## Sprint 35 — Event Detail: One Primary CTA + Clear State Copy

**Goal:** Event pages should feel “obvious” (Krug). No ambiguity about registration status.

**Changes**

* Create a dedicated “Action Panel” on event detail:

  * Desktop: right rail
  * Mobile: sticky bottom bar
* Single primary action determined by HAL affordances:

  * Register / Join Waitlist / Cancel Registration / (none if not allowed)
* Status badges with human copy:

  * REGISTERED, WAITLISTED, CANCELLED, CHECKED_IN
* Confirmations:

  * toast + inline status update (no “did it work?” doubt)

**Acceptance criteria**

* On event detail, user can instantly see:

  * “What is my status?”
  * “What is the next action?”
* Primary action is always visible without scrolling (mobile + desktop)

---

## Sprint 36 — Calendar & Date UX (the “professional product” move)

**Goal:** Stop forcing users to parse dates as text lists; provide calendar views and date picking.

**Changes**

* Add **List ↔ Calendar** toggle on `/events` and/or `/admin/events`
* Provide month/week/agenda view (start with month + agenda)
* Add event quick preview from calendar (no navigation required for basic info)
* Add “Add to calendar” (ICS download) on event detail
* Timezone clarity:

  * show event timezone
  * show local conversion where appropriate

**Library options**

* Lightweight date picking: `react-day-picker` (shadcn-friendly)
* Full calendar UI: `react-big-calendar` (simple, common) or FullCalendar (heavier, feature-rich)

**Acceptance criteria**

* Users can answer “what’s happening this week?” in one glance
* ICS export downloads and imports cleanly into Google/Apple Calendar

---

## Sprint 37 — Account UX: “My Registrations” and Receipts

**Goal:** Give users a home base that reduces support questions.

**Changes**

* `/account` includes:

  * “My registrations” list (upcoming first)
  * status chips + links to event pages
  * cancel from account if allowed
* Consistent confirmation UX on register/cancel:

  * inline state change + toast + “View my registrations” link

**Acceptance criteria**

* A user can verify their attendance status without hunting for the event again
* Canceling from either event page or account page yields the same UX

---

## Sprint 38 — Admin Operations UX (Speed + Confidence)

**Goal:** Admin workflows should be “kiosk-grade” fast and low-error.

**Changes**

* Admin registrations page:

  * search/filter by status (Not checked in, Waitlisted, Checked in)
  * “Check-in mode” (big buttons, rapid feedback, minimal clicks)
  * bulk actions where safe (export, mark as checked-in, cancel)
* Export UX:

  * explicit explanation of include-email governance
  * clear “what you will get” preview before download (column list)

**Acceptance criteria**

* Check-in for 50 attendees can be performed with minimal friction
* Export screen never feels “blocked”; if restricted, it explains what to do next

---

## Sprint 39 — Error & Recovery Pass (Problem Details → Human UI)

**Goal:** Stop showing “API-shaped pain.”

**Changes**

* Problem Details renderer updated:

  * human headline (“We couldn’t register you”)
  * plain cause (“Event is full, you were waitlisted” or “Login required”)
  * next actions (buttons)
  * “Copy support code” for `request_id` tucked away, not dominant
* Retry patterns:

  * inline “Try again” on transient failures
  * auto-refresh after state race (publish in another tab etc.)

**Acceptance criteria**

* Every error state provides a clear next step
* Support code is available but not intimidating

---

## Sprint 40 — Performance + Accessibility Pass (Rauch-grade polish)

**Goal:** Make it feel instant and trustworthy.

**Changes**

* Perf:

  * route-level streaming skeletons everywhere
  * prefetch on hover for likely navigations
  * cache policy tuning for read endpoints
* Accessibility:

  * keyboard navigation for admin tables and dialogs
  * proper focus management
  * aria labels for form errors and status chips
* Add a “UX regression checklist” to PR template

**Acceptance criteria**

* Lighthouse improvements (particularly on mobile)
* Keyboard-only user can complete core flows
* No layout shift on key pages

---

## “Complete app” features (optional, but if you want *fully production-complete*)

These aren’t strictly usability, but users will perceive them as “product maturity”:

* Password reset
* Email verification
* Notifications (registration confirmation, waitlist promotion)
* Admin audit viewer (since you already audit internally)

We can start these at **Sprint 41+** if you want.

---

If you want this to plug into your existing sprint doc style, tell me your sprint template format (or point me at the combined doc section that defines the template), and I’ll rewrite Sprint 33–40 as copy/paste-ready sprint markdown with Stories + Acceptance Gates + Verification steps.
