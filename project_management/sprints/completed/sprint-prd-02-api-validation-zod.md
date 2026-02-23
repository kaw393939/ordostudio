# Sprint PRD-02 — API Request Validation with Zod

## Severity: HIGH

## Goal
Add runtime request-body validation to all 65 mutation API route handlers using Zod schemas, replacing the current pattern of TypeScript type assertions (`as Type`) and manual `if (!field)` checks. Create a shared `parsePayload()` helper that returns RFC 7807 `problem+json` on validation failure.

## Why This Is High Priority
Every POST/PATCH/PUT route currently uses `(await request.json()) as { ... }` — a compile-time-only cast that performs **zero runtime validation**. Malformed payloads, extra fields, wrong types, or missing fields produce unpredictable behavior instead of clean 422 responses. Some routes (e.g., newsletter schedule) have **no field checks at all**.

## Current State (Evidence)

| Pattern | Example | Problem |
|---------|---------|---------|
| Type assertion cast | `const payload = (await request.json()) as { slug: string; ... }` in events POST | No runtime check |
| Manual field checks | `if (!payload.slug \|\| !payload.title \|\| !payload.start \|\| !payload.end \|\| !payload.timezone)` | Misses type/format validation |
| No validation at all | Newsletter schedule route: `as { scheduled_for?: string }` — no checks | Arbitrary input accepted |
| Zod exists in project | `src/lib/auth-forms.ts` (loginSchema, registerSchema), `src/platform/config.ts` (configSchema) | Only used client-side + config |
| `problem()` helper | `src/lib/api/response.ts` line 65 — returns RFC 7807 JSON | Already available |
| Mutation route count | **50 POST + 14 PATCH + 1 PUT = 65** handlers | All need schemas |

## Scope

### 1. Shared Validation Helper (`lib/api/validate.ts`)
```ts
import { z } from "zod";
import { problem } from "./response";

export function parsePayload<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  request?: Request,
): { success: true; data: T } | { success: false; response: Response } {
  const result = schema.safeParse(data);
  if (result.success) return { success: true, data: result.data };
  return {
    success: false,
    response: problem({
      type: "validation-error",
      title: "Validation Error",
      status: 422,
      detail: "Request body failed validation",
      errors: result.error.issues.map((i) => ({
        path: i.path.join("."),
        message: i.message,
      })),
    }, request),
  };
}
```

### 2. Zod Schema Library (`lib/api/schemas/`)
Organized by domain area:
- `auth.schemas.ts` — login, register, password-reset, verify
- `events.schemas.ts` — create event, update event, publish, cancel, registrations, check-in, substitution, export
- `users.schemas.ts` — create user, update status, manage roles
- `deals.schemas.ts` — create deal, update deal, checkout, refund
- `commercial.schemas.ts` — proposals, invoices, payments
- `newsletter.schemas.ts` — create issue, update, schedule, publish, review, generate
- `intake.schemas.ts` — create intake, update
- `offers.schemas.ts` — create offer, create package, update
- `engagements.schemas.ts` — feedback, follow-up, actions, artifacts, reminders
- `entitlements.schemas.ts` — create entitlement, discord-link, discord-sync
- `field-reports.schemas.ts` — create report, feature report
- `referrals.schemas.ts` — create referral code
- `apprentices.schemas.ts` — create/update profile
- `ledger.schemas.ts` — create entry, approve, payouts
- `measurement.schemas.ts` — record event
- `account.schemas.ts` — update profile, delete account
- `invitations.schemas.ts` — create invitation, accept

### 3. Migrate All 65 Route Handlers
For each route, replace:
```ts
// BEFORE
const payload = (await request.json()) as { slug: string; title: string; ... };
if (!payload.slug || !payload.title) {
  return problem({ type: "validation-error", ... });
}
```
With:
```ts
// AFTER
const raw = await request.json();
const parsed = parsePayload(createEventSchema, raw, request);
if (!parsed.success) return parsed.response;
const { slug, title, ... } = parsed.data;
```

### 4. Shared Zod Refinements
- `isoDatetime` — validates ISO 8601 datetime string
- `slug` — lowercase alphanumeric + hyphens, 3-100 chars
- `email` — Zod email with `.trim().toLowerCase()`
- `nonEmptyString` — `.trim().min(1)`
- `positiveInt` — `z.number().int().positive()`
- `currencyCode` — `z.enum(["USD", "EUR", "GBP"])`

## Non-Goals
- Query parameter validation on GET routes (separate sprint)
- Client-side form schema reuse (already done in auth-forms.ts)
- OpenAPI spec generation from Zod schemas (future)

## TDD Process

### Red Phase — Tests first (per schema group)

1. **`parsePayload()` helper tests** (`lib/api/__tests__/validate.test.ts`):
   - Valid payload → `{ success: true, data }` with correct types
   - Missing required field → `{ success: false }` with 422 problem response
   - Wrong type (number where string expected) → 422
   - Extra fields stripped (Zod `.strict()` or `.strip()`)
   - Multiple errors → all reported in `errors` array
   - Empty body → 422

2. **Schema tests** (one test file per schema group, ~16 files):
   - Each schema: valid payload passes, each required field omitted fails
   - Type coercion works (e.g., string "100" for capacity)
   - Format validation (ISO dates, emails, slugs)
   - Edge cases (empty strings, whitespace-only, negative numbers)

3. **Route integration tests** (extend existing e2e tests):
   - POST /api/v1/events with invalid payload → 422 with structured errors
   - POST /api/v1/auth/register with missing email → 422
   - PATCH /api/v1/events/:slug with invalid date format → 422
   - Valid payloads still work identically to today

### Green Phase — Implement schemas + wire routes
### Refactor Phase — Extract common refinements, reduce duplication

## E2E Verification Tests

### Test: "invalid event creation returns structured validation errors"
```
1. POST /api/v1/events with { slug: "", title: null, start: "not-a-date" }
2. Assert: 422 status
3. Assert: content-type is application/problem+json
4. Assert: body.type === "validation-error"
5. Assert: body.errors is array with 3+ entries
6. Assert: each error has path and message
7. Assert: errors include "slug", "title", "start" paths
```

### Test: "valid event creation still works after Zod migration"
```
1. POST /api/v1/events with full valid payload (same as existing e2e tests)
2. Assert: 201 with event data (identical behavior to pre-migration)
```

### Test: "extra fields are stripped from payload"
```
1. POST /api/v1/auth/register with { email, password, terms_accepted: true, admin: true, __proto__: "hack" }
2. Assert: 201 (extra fields ignored, not stored)
3. Assert: user does NOT have admin role
```

### Test: "all 65 mutation routes reject empty body gracefully"
```
Parameterized test over all mutation route paths:
1. POST/PATCH/PUT each route with {} or null body
2. Assert: none return 500 — all return 400 or 422
```

## Acceptance Criteria
- [ ] `parsePayload()` helper in `lib/api/validate.ts` with unit tests
- [ ] Shared Zod refinements (`isoDatetime`, `slug`, `email`, etc.)
- [ ] Zod schemas for all 65 mutation route handlers
- [ ] All 65 routes migrated from type-assertion to `parsePayload()`
- [ ] Validation errors return RFC 7807 format with field-level error details
- [ ] Extra fields are stripped (no prototype pollution)
- [ ] All existing e2e tests still pass (no behavior change for valid payloads)
- [ ] New e2e tests verify 422 responses for invalid payloads
- [ ] `npm test`, `npm run lint`, `npm run build` all pass

## End-of-Sprint Verification
```bash
npm test
npm run lint
npm run build
```
