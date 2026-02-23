# Sprint PRD-13 — Test Coverage Gaps + External Service Contract Tests

## Severity: MEDIUM

## Goal
Close the test coverage gaps: add e2e tests for the 30+ API routes and 20+ pages that lack dedicated tests, create contract tests for external service integrations (Stripe, Postmark, Discord), and establish a coverage threshold gate.

## Why This Matters
There are 49 page.tsx files but only ~15 have dedicated or partial test coverage. API routes for intake, commercial/proposals/invoices, instructor management, and many admin features have no e2e tests. External service calls (Stripe SDK, Postmark API, Discord API) are mocked in tests but there are no contract tests verifying the mock shapes match real API responses. A refactoring could silently break untested paths.

## Current State (Evidence)

### Pages Without Tests (30 of 49)
**Public pages without tests:**
- Login, Register, Account/Apprentice Profile
- Services index, Services/Advisory, Services/Workshop, Services/Team Program
- Newsletter/Unsubscribe, Apprentices/[handle]
- Studio, Studio/Report, Insights
- About, Privacy, Terms

**Admin pages without tests:**
- Admin dashboard, Events list, Event detail
- Event registrations, Event export
- Users, Newsletter/[id]
- Registrations, Intake, Commercial
- Offers, Offers/[slug], Settings
- Apprentices, Deals/[id], Engagements

### 29 Existing E2E Test Files
Coverage is concentrated on:
- Auth flows (login, register, password reset, verification, session hardening)
- Events (creation, discovery, HAL links, public API)
- Registrations (account view)
- Financial (Stripe payments, Connect, ledger, deals)
- Content (newsletter, field reports, apprentices)
- Admin (invitations, operations security, audit)
- Cross-cutting (compliance, release journeys, a11y, UI hardening)

### Untested API Route Areas
| Area | Routes | Test Status |
|------|--------|-------------|
| Intake requests | POST/GET/PATCH `/api/v1/intake`, GET `/api/v1/intake/[id]` | Zero tests |
| Commercial (proposals) | POST/GET/PATCH `/api/v1/commercial/proposals` | Zero tests |
| Commercial (invoices) | POST/GET/PATCH `/api/v1/commercial/invoices`, payments | Zero tests |
| Instructors | GET/POST `/api/v1/instructors`, availability | Zero tests |
| Offers management | POST/PATCH `/api/v1/offers`, packages | Zero tests |
| Account delete | POST `/api/v1/account/delete` | Zero tests |
| Account activity | GET `/api/v1/account/activity` | Zero tests |
| Account attention | GET `/api/v1/account/attention` | Zero tests |
| Event artifacts | POST `/api/v1/events/[slug]/artifacts` | Zero tests |
| Event follow-up | POST `/api/v1/events/[slug]/follow-up/reminders` | Zero tests |
| Event outcomes | POST `/api/v1/events/[slug]/outcomes` | Zero tests |
| Event ICS export | GET `/api/v1/events/[slug]/ics` | Zero tests |
| Feature flags | GET `/api/v1/feature-flags` | Zero tests |
| Docs endpoint | GET `/api/v1/docs` | Zero tests |
| Navigation context | GET `/api/v1/nav/context` | Zero tests |

### External Service Mocks
- **Stripe** — `vi.mock("@/adapters/stripe/stripe-client")` in 4 test files
- **Discord** — `vi.mock("@/adapters/discord/discord-client")` in 1 test file
- **Postmark** — Mocked via `NEWSLETTER_EMAIL_PROVIDER=console` environment trick
- No contract tests verify mock shapes match real API responses

## Scope

### 1. External Service Contract Tests

#### Stripe Contract Tests (`adapters/stripe/__tests__/stripe-contract.test.ts`)
Verify that our mock return shapes match Stripe SDK types:
```ts
import type Stripe from "stripe";

// Verify our mock checkout session matches Stripe's type
const mockSession: Stripe.Checkout.Session = {
  id: "cs_test_123",
  url: "https://checkout.stripe.com/...",
  payment_intent: "pi_123",
  // ... assert all fields we use are present
};
```

Test that:
- Mock `createCheckoutSession` returns shape matching `Stripe.Checkout.Session`
- Mock `createRefund` returns shape matching `Stripe.Refund`
- Mock `constructWebhookEvent` returns shape matching `Stripe.Event`
- Mock `createConnectAccount` returns shape matching `Stripe.Account`
- Mock `createTransfer` returns shape matching `Stripe.Transfer`

#### Discord Contract Tests (`adapters/discord/__tests__/discord-contract.test.ts`)
Verify Discord API response shapes match our assumptions.

#### Postmark Contract Tests (`adapters/postmark/__tests__/postmark-contract.test.ts`)
Verify Postmark API response shapes match our send function expectations.

### 2. New E2E Test Files

#### `e2e-intake-pipeline.test.ts`
```
1. Submit intake request as public user
2. Admin views intake list → new request appears
3. Admin updates intake status → QUALIFIED
4. Verify status history recorded
5. Verify audit trail
```

#### `e2e-commercial-operations.test.ts`
```
1. Admin creates proposal linked to offer
2. Admin converts proposal to invoice
3. Admin records payment on invoice
4. Verify status history for proposal and invoice
5. Verify amounts and dates
```

#### `e2e-instructor-management.test.ts`
```
1. Admin creates instructor record
2. Admin sets instructor availability
3. Admin assigns instructor to event
4. Verify assignment recorded
5. View instructor assignments list
```

#### `e2e-offers-catalog.test.ts`
```
1. Admin creates offer with packages
2. Public user views offer → sees packages
3. Admin updates offer → changes reflected
4. Admin adds package → package count increases
5. Verify pricing display
```

#### `e2e-account-lifecycle.test.ts`
```
1. Register user
2. View account activity → shows registration
3. View account attention → shows pending items
4. Request account deletion
5. Verify deletion record created
6. Verify user cannot login after deletion
```

#### `e2e-event-delivery.test.ts`
```
1. Admin creates + publishes event
2. Admin assigns instructor
3. Admin records outcomes after event
4. Users submit artifacts
5. Admin sends follow-up reminders
6. Export ICS calendar file → valid .ics content
```

#### `e2e-feature-flags.test.ts`
```
1. GET /api/v1/feature-flags with defaults
2. Assert: all 6 flags present with boolean values
3. Set APP_RUNTIME_FEATURE_FLAGS_JSON with override
4. GET /api/v1/feature-flags
5. Assert: override applied
```

#### `e2e-navigation-context.test.ts`
```
1. Login as regular user → GET /api/v1/nav/context
2. Assert: user navigation items present
3. Login as admin → GET /api/v1/nav/context
4. Assert: admin navigation items present
5. No auth → GET /api/v1/nav/context
6. Assert: public navigation only
```

### 3. Page Rendering Smoke Tests
A single parameterized test file that imports every page.tsx and verifies it renders without throwing:
```ts
// e2e-page-smoke.test.ts
const publicPages = [
  { path: "/", page: () => import("@/app/(public)/page") },
  { path: "/events", page: () => import("@/app/(public)/events/page") },
  // ... all 49 pages
];

describe.each(publicPages)("page $path", ({ page }) => {
  it("renders without throwing", async () => {
    const mod = await page();
    // Verify the default export is a function (React component)
    expect(typeof mod.default).toBe("function");
  });
});
```

### 4. Coverage Threshold Gate
Add to `vitest.config.ts`:
```ts
coverage: {
  provider: "v8",
  reporter: ["text", "json", "html"],
  thresholds: {
    statements: 70,
    branches: 60,
    functions: 65,
    lines: 70,
  },
  exclude: [
    "**/__tests__/**",
    "**/node_modules/**",
    "e2e/**",
  ],
}
```

### 5. Test Quality Audit
Review existing tests for:
- Tests that never assert (just call functions)
- Tests that only check happy path (no error cases)
- Duplicated test setup that should be extracted to fixtures
- Tests that depend on execution order

## Non-Goals
- 100% code coverage (targeting 70%+ lines)
- Performance/load testing (separate concern)
- Visual regression testing (a11y sprint handles this)
- Full UI integration tests (page rendering, not user interaction)
- Testing third-party library behavior

## TDD Process
This sprint IS about writing tests — so the process is:
1. Write failing test for untested feature
2. Verify the test fails for the right reason (feature exists but was untested, not missing)
3. If feature is broken, fix it
4. Test passes

### Red-Green sequence for each test file:
1. Write test → run → if it passes (code works), mark as coverage gain
2. If test fails due to actual bug → fix bug → test passes
3. If test reveals missing feature → document as future work, skip test with `.todo()`

## E2E Verification Tests
All the tests described above ARE the e2e verification. The meta-verification is:

### Test: "coverage thresholds met"
```
1. npm run test -- --coverage
2. Assert: statements >= 70%
3. Assert: branches >= 60%
4. Assert: functions >= 65%
5. Assert: lines >= 70%
```

### Test: "no untested API routes"
```
Scan all route.ts files and verify each has at least one test that exercises it.
```

## Acceptance Criteria
- [ ] 3 external service contract test files (Stripe, Discord, Postmark)
- [ ] 8 new e2e test files covering untested API areas
- [ ] Page rendering smoke tests for all 49 pages
- [ ] Coverage thresholds configured in vitest.config.ts
- [ ] Coverage meets thresholds (70% statements, 60% branches)
- [ ] All existing tests still pass
- [ ] Zero broken features discovered (or all fixed)
- [ ] `.todo()` tests documented for any missing features found
- [ ] `npm test`, `npm run lint`, `npm run build` all pass

## End-of-Sprint Verification
```bash
npm test
npm run lint
npm run build
npm run test -- --coverage
```
