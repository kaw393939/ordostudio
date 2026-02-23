Letter to AI Coding Agent — UI Phase (Consume API + Prepare for Production)
Team,
We have API Foundation + Auth Session + Users/Events/Registrations APIs + Hardening/Release completed and verified. Key invariants we must preserve:
UI must treat /api/v1 as the discoverable entry point and follow HAL _links affordances. 
sprint-07-api-foundation
Auth is browser-ready session-based with secure cookies + CSRF-safe mutations and role-aware HAL affordances via /api/v1/me. 
sprint-08-auth-session
 
sprint-08-auth-session
Events have state-driven HATEOAS action links (DRAFT→publish, PUBLISHED→cancel). 
sprint-10-events-api
Registrations must preserve WAITLISTED / CANCELLED / CHECKED_IN transitions and export governance (PII constraints). 
sprint-11-registrations-api
 
sprint-11-registrations-api
Hardening includes rate limiting and handler-level auth enforcement; UI should degrade gracefully and show Problem Details errors. 
sprint-12-api-hardening-release
Super-admin remains CLI-only (token issuance + DB backup/restore/dangerous ops do not get UI surfaces). 
sprint-03-auth-users
 
sprint-06-hardening-release
Our goal now: implement the UI (user-facing + admin console) in the Next.js App Router, consuming the API as a client.
0) UI Tech Choices (industry standard)
Use a conventional Next.js UI stack:
Next.js App Router for layouts/pages and server components where useful (official docs)
Auth.js integration already exists; follow Next.js auth guidance for App Router concepts
React Hook Form + Zod for forms + validation (single schema reuse where possible).
TanStack Query for client-side caching + mutation orchestration, with a thin HAL client underneath (keep HAL/HATEOAS central). (TanStack Query is a common production default; keep the integration minimal and well-contained.)
Tailwind + shadcn/ui (or Radix primitives) for fast, consistent, accessible components (buttons, dialogs, tables, toasts).
1) Non-negotiable UI Contracts
1.1 HATEOAS-first navigation
The UI must not hardcode action routes like “publish = POST /events/{slug}/publish”. Instead:
Fetch event resource → read _links["app:publish"].href (if present) → POST there.
Same for cancel, export, registrations links, etc.
This aligns with Sprint 10’s state-driven affordance contract. 
sprint-10-events-api
1.2 Error handling
All non-2xx responses are application/problem+json per the API contract. UI must:
Ren
sprint-10-events-api
alidation errors[] if present
Show request_id to the user (copy button) for support/debugging
This is grounded in Sprint 07’s Problem Details contract. 
sprint-07-api-foundation
 
sprint-07-api-foundation
1.3 Role gating via /api/v1/me
UI route access is driven by:
session presen
sprint-07-api-foundation
u
sprint-07-api-foundation
ities) 
sprint-08-auth-session
 
sprint-08-auth-session
1.4 Respect hardening behavior
If rate-limited (Sprint 12), UI must show a fri
sprint-08-auth-session
n
sprint-08-auth-session

sprint-12-api-hardening-release
2) UI Information Architecture
2.1 Public / User-facing
Routes (App Router):
/ → Landing (or redire
sprint-12-api-hardening-release
 → Published events list
/events/[slug] → Event detail (register/cancel if allowed)
/login, /register
/account → “My info” + “My registrations” (optional but recommended)
Behaviors:
Anonymous users can view published events and event details.
Authenticated users can register; if full, show WAITLISTED state. 
sprint-11-registrations-api
Users can cancel their registration (transitions to CANCELLED, no hard delete). 
sprint-11-registrations-api
  
sprint-11-registrations-api
es:
/admin → dashboard
/admin/events → list + create
/admin/events/[slug]
sprint-11-registrations-api
ons (only if links exist)
/admin/events/[slug]/registrations → list + add/cancel + check-in
/admin/events/[slug]/export → export UI (respect include_email governance)
/admin/users → list/show/status/role mgmt (no SUPER_ADMIN changes) 
sprint-09-users-api
Important:
Admin UI must never surface CLI-only operations (token create/revoke; db backup/restore). 
sprint-03-auth-users

sprint-09-users-api

sprint-06-hardening-release
3) The HAL Client (small but crucial)
Create lib/halClient with:
`getRoot()
sprint-03-auth-users
i
sprint-06-hardening-release

sprint-07-api-foundation
follow(resource, rel) → returns { href, method? }
request(relOrHref, {method, body}) → fetch wrapper th
sprint-07-api-foundation
 - sets accept headers (application/hal+json, application/problem+json)
parses Problem Details
returns typed Ok | Err(problem) shape for UI
This is what makes “HATEOAS real” rather than a decorative API format.
4) UI Security & Hygiene
Cookies are HttpOnly, so UI cannot read tokens; it just uses fetch(..., { credentials: 'include' }). 
sprint-08-auth-session
All mutations must be CSRF-safe (follow the existing server pattern; do not bypass by calling service methods d
sprint-08-auth-session

sprint-08-auth-session
Prevent privilege escalation:
never render role-grant UI for SUPER_ADMIN
rely on API denial as final ga
sprint-08-auth-session

sprint-09-users-api
5) UI Test Strategy (must match our engineering culture)
Component tests for critical forms and error rend
sprint-09-users-api
ensuring we follow _links (mock HAL resources)
E2E tests (Playwright recommended) covering:
register/login/logout
browse events
register/waitlist/cancel
admin event create→publish→cancel with state-dependent links 
sprint-10-events-api
registrations + check-in flows 
sprint-11-registrations-api
export governance (include_email blocked un
sprint-10-events-api

sprint-11-registrations-api
Proposed U
sprint-11-registrations-api
 — UI Foundation + Design System
App Router layouts, navigation, 
sprint-11-registrations-api
t + Problem Details renderer (with request_id)
Protected route scaffolding for /admin/* using /api/v1/me links 
sprint-08-auth-session
Sprint 14 — Public Events UI
/events list + paging/filter controls (based on HAL)
/events/[slug] det
sprint-08-auth-session
us and available actions via _links 
sprint-10-events-api
Sprint 15 — Auth Pages + Account
/login, /register, /account
Use API endpoints from Sprint 08; han
sprint-10-events-api
ils 
sprint-08-auth-session
 
sprint-12-api-hardening-release
Sprint 16 — Registration UX
Register from event page
Show WAITLISTED / REGIS
sprint-08-auth-session
a
sprint-12-api-hardening-release
ard delete) 
sprint-11-registrations-api
Sprint 17 — Admin Events Console
/admin/events list + create
/admin/events/[slug] edit + publish/can
sprint-11-registrations-api
appear only if the HAL links exist (state-driven affordances) 
sprint-10-events-api
Sprint 18 — Admin Registrations + Check-in + Export
Registrations list + add/cancel + check-in
Export UI
sprint-10-events-api
 (include_email gating) 
sprint-11-registrations-api
 
sprint-11-registrations-api
Sprint 19 — Admin Users UI
List/search users
Enable/disable
Add/remove r
sprint-11-registrations-api
d
sprint-11-registrations-api

sprint-09-users-api
Sprint 20 — UI Hardening + E2E + Release Gate
Playwright suite
Accessibility pass (keyboard nav, labels,
sprint-09-users-api
polish (Problem Details everywhere)
Ensure no new escalation surfaces (SUPER_ADMIN remains CLI-only) 
sprint-03-auth-users
Exit Gate for “UI Phase 1”
We consider UI Phase 1 complete when:
All public flows work end-to-end agains
sprint-03-auth-users
 not hardcoded routes 
sprint-07-api-foundation
Admin can run the full lifecycle: create → publish → registrations → check-in → export (with governance) 
sprint-10-events-api

sprint-07-api-foundation

sprint-11-registrations-api
E2E tests pass and capture request_id on failures
No UI surface exists for CLI-on
sprint-10-events-api

sprint-06-hardening-release

sprint-11-registrations-api
—End of letter.