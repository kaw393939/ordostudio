Letter to AI Coding Agent — Build the Professional HATEOAS API (Next Phase)
Team,
We have Sprints 01–06 completed and verified for the CLI (appctl) with strong contracts: deterministic config precedence and strict JSON envelope (ok/command/env/data/warnings/errors/request_id) 
sprint-01-foundation
; DB lifecycle primitives using Drizzle + drizzle-kit 
sprint-02-db-core
; super-admin token issuance with hashed-at-rest / shown once semantics 
sprint-03-auth-users
; event lifecycle invariants 
sprint-04-events
; registration/waitlist/check-in and export redaction rules 
sprint-05-registrations-export
; and hardening/guardrails for dangerous DB operations in prod 
sprint-06-hardening-release
.
Now we need a professional HTTP API (for the future UI + admin UI), with these requirements:
Reuse the existing domain/service layer (no duplicated business rules).
HATEOAS-first (hypermedia-driven navigation/actions).
Production security and operational rigor.
UI-ready auth/session model and RBAC.
Super-admin-only actions remain CLI-only (the API must not become an escalation path).
This letter defines the spec + implementation sprint plan. No implementation shortcuts. TDD as in prior sprints.
1) Architectural Target
1.1 Transport vs Domain
Route Handlers in the app/ directory are the HTTP transport layer (Next.js “Route Handlers”).
Each handler does only:
parse + validate input
authenticate + authorize
call domain service methods (the same ones used by CLI commands)
render response in HAL
render errors as Problem Details
1.2 Hypermedia Format (HATEOAS)
Use HAL with Content-Type: application/hal+json.
Every successful response MUST include _links.self and appropriate affordance links.
We will optionally include _embedded for common UI needs (list endpoints may embed items).
1.3 Error Format (Industry Standard)
All errors MUST be application/problem+json using RFC 9457 Problem Details (obsoletes RFC 7807).
Use canonical type/title/status/detail/instance plus extension members (e.g., request_id, errors[] for field validation).
1.4 Link Relations Standardization
Use registered relations where possible, aligned with RFC 8288 and the IANA link relation registry.
For custom relations, define a consistent prefix (e.g., app:) and document them.
2) Security Model (No Compromises)
2.1 Auth Strategy (UI-Ready)
We need browser-safe auth (HTTP-only cookies) and optional programmatic access:
Primary (UI):
Implement session-based auth using Auth.js (credentials provider initially).
Passwords: strong hashing (argon2id preferred).
Cookies: HttpOnly, Secure in prod, SameSite=Lax (or Strict where viable), rotate sessions on privilege changes.
CSRF: ensure mutation endpoints are CSRF-safe (cookie + CSRF token patterns or same-origin checks).
Secondary (Automation / tools):
Support Authorization: Bearer <token> for non-browser clients using the existing super-admin token model as a foundation, BUT:
bearer tokens must have scoped privileges (e.g., service:export, service:read) and must not allow “create token” or “grant SUPER_ADMIN”.
do not encourage use of bearer tokens from the browser.
2.2 RBAC & Non-Escalation Rule
Roles: keep existing roles (at minimum USER, ADMIN, SUPER_ADMIN).
SUPER_ADMIN capabilities stay CLI-only:
token create/revoke
db backup/restore/reset
any “force-prod” style operations
This mirrors Sprint 03/06 intention: super-admin tokens and dangerous ops are tightly governed 
sprint-03-auth-users
 
sprint-06-hardening-release
.
2.3 Do Not Rely Solely on Middleware for Authorization
There have been real-world middleware auth bypass issues in Next.js (e.g., middleware bypass via internal headers), so:
You MAY use m
sprint-03-auth-users
e
sprint-06-hardening-release
r must enforce auth/authorization inside the handler** (defense in depth).
2.4 Rate Limiting & Abuse Controls
Implement rate limiting at least for:
login
registration
export endpoints
Start with in-memory/LRU for local and single-node; design so it can switch to Redis later.
2.5 Audit
Continue “fail-closed” auditing for mutations (same spirit as Sprint 02) 
sprint-02-db-core
.
Every write endpoint must produce an audit record: who/what/when, before/after references, and request_id.
3) API Surface (V1)
Base path: /api/v1
3.1 Root (Discoverability)
GET /api/v1
Returns a HAL document with links to major resources:
self
app:me
app:events
app:users (admi
sprint-02-db-core
PI endpoint)
app:health
This is the entry point for hypermedia navigation.
3.2 Auth & Identity
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/logout
GET /api/v1/me
Rules:
Registration creates a USER with ACTIVE status.
Admins are not created via public register unless explicitly allowed in config.
Responses:
me returns _links for user actions available to that role.
3.3 Users (Admin)
GET /api/v1/users (filterable, paginated)
GET /api/v1/users/{id}
PATCH /api/v1/users/{id} (status changes like enable/disable)
POST /api/v1/users/{id}/roles (add role)
DELETE /api/v1/users/{id}/roles/{role} (remove role)
Constraints:
Unique email enforced (existing invariant) 
sprint-03-auth-users
Role add/remove idempotent (existing invariant) 
sprint-03-auth-users
Never allow adding/removing SUPER_ADMIN via HTTP API (CLI-only).
3.4 Events
Mirror Sprint 04 semantics:
GET /api/v1/events
filter: status/from/to
HAL paging: next/prev
POST /api/v1/events (ADMIN)
GET /api/v1/events:contentReference[oaicite:21]{index=21}nts/{slug} (ADMIN)
`POST /api/v1/events/{slug}/p
sprint-03-auth-users

sprint-04-events
POST /api/v1/events/{slug}/cancel (ADMIN; reason required) 
sprint-04-events
HATEOAS requirements:
Event resource must advertise available actions via links depending on state:
if DRAFT → show app:publish
if PUBLISHED → show app:cancel
if CANCELLED → no publish/cancel actions, only read 
sprint-04-events
 Check-in + Export
Mirror Sprint 05 semantics:
`GET /api/v1/ev
sprint-04-events
DMIN/STAFF)
POST /api/v1/events/{slug}/registrations (ADMIN)
capacity full ⇒ WAITLISTED 
sprint-05-registrations-export
DELETE /api/v1/events/{slug}/registrations/{userId} (ADMIN)
no hard delete; transition CANCELLED 
sprint-05-registrations-export
POST /api/v1/events/{slug}/checkins (STAFF/ADMIN)
CHECKED_IN transition rules 
sprint-05-registrations-export
GET /api/v1/events/{slug}/export?format=csv|json&include_email=..:contentReference[oaicite:30]{index=30}include_email` requires elevated permission / token outside local 
sprint-05-registrations-export
streami
sprint-05-registrations-export
; always audited
HATEOAS:
Event resource should link to:
app:registrations
:contentReference[oaicite:33]{index=33} - app:checkins` (if authorized)
4) Response Conventions
4.1 HAL Shape
Minimum:
Resource fields
_links
Optional:
_embedded for lists (events l
sprint-05-registrations-export
oints must include:
_links.self
_links.next / _links.prev when relevant
paging metadata (page, page_size, total or cursor) in a standard place (e.g., top-level page object)
4.2 Problem Details Shape
Must conform to RFC 9457 (problem+json).
Also include:
request_id
errors[] for validation (field, message, code)
4.3 Request Correlation
Every response includes a request_id (header + body extension for errors).
4.4 Caching
Auth and user-specific endpoints: Cache-Control: no-store
Public event listings may be cacheable later, but keep conservative initially.
5) Documentation & Contract Guarantees
5.1 OpenAPI (Source of Truth)
Generate and publish OpenAPI 3.1 from the same validation schemas (single source of truth) using Zod → OpenAPI tooling (e.g., zod-to-openapi).
Provide:
GET /api/v1/docs → OpenAPI JSON
optional: Swagger UI/Redoc endpoint later
5.2 Testing Strategy (Must-Have)
Contract tests for:
HAL _links presence and correct rels by state
Problem Details error shape
RBAC matrix (USER vs ADMIN vs STAFF) for each endpoint
Route handler testing can use a dedicated helper like next-test-api-route-handler to emulate handlers accurately.
Integration tests should run against a temp SQLite DB file with migrations.
6) Sprint Plan (You create the new sprints)
Create new sprints in the same style as Sprints 01–06: goal, scope, stories, acceptance criteria, end-of-sprint verification commands, exit gate.
Sprint 07 — API Foundation (HAL + Problem Details + OpenAPI skeleton)
Route handler scaffolding, shared response builders
RFC 9457 errors
Root /api/v1 discoverability resource
OpenAPI endpoint stub
Sprint 08 — Auth & Session (UI-ready)
Auth.js credentials auth
Password hashing + account lifecycle
/auth/register/login/logout + /me
CSRF-safe mutations
Sprint 09 — Users API (Admin)
List/show/update status
Role add/remove with non-escalation rule
Audit coverage and RBAC tests
Sprint 10 — Events API (Admin + Public Read)
Full event lifecycle endpoints aligned to Sprint 04 invariants 
sprint-04-events
Hypermedia links conditional on event state
Sprint 11 — Registrations/Check-in/Export API
Capacity/waitlist rules, cancel semantics, check-in transitions 
sprint-05-registrations-export
Export redaction governance mirrored from CLI rules 
sprint-05-registrations-export
Audit + authorization tests
Sprint 12 — Hardening Pass (Rate limiting, security regression, runbooks)
Rate limiting + abuse controls
Security headers, “don’t trust middleware alone” enforcement
Prod
sprint-04-events
es for API
7) Non-Negotiables Checklist
No duplicated business logic (CLI + API must call the same services).
HAL everywhere for success respon
sprint-05-registrations-export
**RFC 9457 everywh
sprint-05-registrations-export
n/problem+json`).
Authorization enforced in handlers, not only middleware.
Super-admin stays CLI-only (no token issuance, no backup/restore, no prod force operations in HTTP API). 
sprint-06-hardening-release
Audited mutations and fail-closed posture consistent with existing system. 
sprint-02-db-core
Deliver the Sprint 07 spec first, then proceed sequentially.
—End of letter.