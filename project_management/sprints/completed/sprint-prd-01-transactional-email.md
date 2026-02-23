# Sprint PRD-01 — Transactional Email Port + Auth Email Delivery

## Severity: CRITICAL

## Goal
Build a `TransactionalEmail` port in `core/ports/` with a Postmark adapter and a console/fake adapter, then wire it into the auth flows so that password-reset tokens, email-verification tokens, and registration welcome messages are actually **emailed** instead of returned in the HTTP response body.

## Why This Is Critical
Today, `requestPasswordReset()` in `src/lib/api/auth.ts` generates a `reset_*` token and returns it in the JSON response (local env only). In staging/prod the token is generated, stored — and **discarded**. Users literally cannot reset their passwords or verify their email outside of local dev. Registration confirmation and event registration confirmation emails don't exist at all.

## Current State (Evidence)

| What exists | Where |
|-------------|-------|
| Newsletter-only Postmark send | `src/lib/api/newsletter.ts` lines 818-865 — `sendNewsletterEmail()` using raw `fetch()` to Postmark API |
| `EmailProviderResult` type | `src/lib/api/newsletter.ts` line 808 |
| Password reset token flow (no email) | `src/lib/api/auth.ts` lines 565-607 — `requestPasswordReset()` |
| Email verification token flow (no email) | `src/lib/api/auth.ts` lines 710-758 — `requestEmailVerification()` |
| Registration flow (no welcome email) | `src/lib/api/auth.ts` lines 242-340 — `registerUser()` |
| Env vars: `POSTMARK_SERVER_TOKEN`, `NEWSLETTER_FROM_EMAIL` | Already in use for newsletter |
| `NEWSLETTER_EMAIL_PROVIDER` toggle (`console` / `postmark`) | `src/lib/api/newsletter.ts` line 825 |

## Scope

### 1. TransactionalEmail Port (`core/ports/transactional-email.ts`)
```ts
export type TransactionalEmailMessage = {
  to: string;
  subject: string;
  textBody: string;
  htmlBody: string;
  tag?: string;               // for Postmark "Tag" tracking
  messageStream?: string;     // e.g. "outbound" vs "broadcast"
};

export type EmailSendResult =
  | { ok: true; messageId?: string }
  | { ok: false; error: string };

export interface TransactionalEmailPort {
  send(message: TransactionalEmailMessage): Promise<EmailSendResult>;
}
```

### 2. FakeTransactionalEmail (`core/ports/__tests__/fake-transactional-email.ts`)
- Records all sent messages in `sentMessages: TransactionalEmailMessage[]`
- Configurable `nextResult: EmailSendResult` for error-path testing
- `reset()` method

### 3. ConsoleTransactionalEmail (`adapters/console/console-email.ts`)
- Logs subject + recipient to stdout
- Always returns `{ ok: true, provider: "console" }`
- Used when `TRANSACTIONAL_EMAIL_PROVIDER=console` (default in local)

### 4. PostmarkTransactionalEmail (`adapters/postmark/postmark-email.ts`)
- Wraps `fetch("https://api.postmarkapp.com/email", ...)` exactly like the existing newsletter code
- Reads `POSTMARK_SERVER_TOKEN`, `TRANSACTIONAL_FROM_EMAIL` env vars
- Maps to/from the port types
- Used when `TRANSACTIONAL_EMAIL_PROVIDER=postmark`

### 5. Email Template Functions (`core/use-cases/email-templates.ts`)
Pure functions that accept data and return `TransactionalEmailMessage`:
- `buildPasswordResetEmail(email, resetToken, baseUrl)` — includes reset link, 30-min expiry note
- `buildEmailVerificationEmail(email, verifyToken, baseUrl)` — includes verify link
- `buildWelcomeEmail(email, baseUrl)` — post-registration welcome
- `buildRegistrationConfirmationEmail(email, eventTitle, eventDate, baseUrl)` — event registration receipt

### 6. Wire Into Auth Flows
- `requestPasswordReset()` calls `emailPort.send(buildPasswordResetEmail(...))` instead of returning the token
- `requestEmailVerification()` calls `emailPort.send(buildEmailVerificationEmail(...))`
- `registerUser()` calls `emailPort.send(buildWelcomeEmail(...))` after user creation
- Auth functions accept an `emailPort: TransactionalEmailPort` parameter (dependency injection)

### 7. Wire Into Registration Flow
- `registerParticipant()` in the event registration use-case sends a confirmation email

## Non-Goals
- HTML email templates with rich branding (plain semantic HTML is fine for now)
- Email delivery tracking / open tracking / click tracking
- Unsubscribe for transactional emails (not required by CAN-SPAM)
- Migrating the existing newsletter send to use this port (separate concern)

## TDD Process

### Red Phase — Write tests first
1. **Email template unit tests** (pure functions):
   - `buildPasswordResetEmail()` returns correct subject, contains reset URL with token, has expiry text
   - `buildEmailVerificationEmail()` returns correct subject, contains verify URL
   - `buildWelcomeEmail()` returns correct subject
   - `buildRegistrationConfirmationEmail()` contains event title and date
   - All produce both textBody and htmlBody

2. **FakeTransactionalEmail tests**:
   - Records sent messages
   - Returns configured result
   - `reset()` clears history

3. **PostmarkTransactionalEmail contract tests**:
   - Sends to Postmark API with correct headers (mock fetch)
   - Maps success response to `{ ok: true, messageId }`
   - Maps failure response to `{ ok: false, error }`
   - Reads env vars correctly

4. **Auth integration tests** (extend existing e2e tests):
   - `requestPasswordReset()` called with fake email port → `sentMessages` contains password reset email to correct address
   - `requestEmailVerification()` → sends verification email
   - `registerUser()` → sends welcome email
   - Auth route handlers inject email port correctly
   - When email send fails, auth operation still succeeds (fire-and-forget with logged warning)

### Green Phase — Implement to pass
### Refactor Phase — Extract shared Postmark config, DRY template helpers

## E2E Verification Tests

### Test: "password reset sends email with valid reset link"
```
1. Register user via POST /api/v1/auth/register
2. Request password reset via POST /api/v1/auth/password-reset/request
3. Assert: fake email port received exactly 1 message
4. Assert: message.to === registered email
5. Assert: message.subject contains "password reset" (case-insensitive)
6. Assert: message.textBody contains a URL with a reset token
7. Extract token from email body
8. Confirm reset via POST /api/v1/auth/password-reset/confirm with extracted token + new password
9. Login with new password → succeeds
10. Login with old password → fails
```

### Test: "email verification sends email with valid verify link"
```
1. Register user (with APPCTL_REQUIRE_EMAIL_VERIFICATION=true)
2. Assert: fake email port received welcome email + verification email
3. Extract verify token from verification email body
4. Confirm verification via POST /api/v1/auth/verify/confirm
5. Login → succeeds (user is now ACTIVE)
```

### Test: "event registration sends confirmation email"
```
1. Setup: admin creates and publishes event
2. User registers for event via POST /api/v1/events/:slug/registrations
3. Assert: fake email port received confirmation email
4. Assert: email contains event title and date
```

### Test: "email send failure does not block auth operation"
```
1. Configure fake email port to return { ok: false, error: "service down" }
2. Request password reset → still returns 200 accepted
3. Token is still stored in DB (can be used if user somehow gets it)
```

## Acceptance Criteria
- [ ] `TransactionalEmailPort` interface in `core/ports/`
- [ ] `FakeTransactionalEmail` test double with full recording
- [ ] `PostmarkTransactionalEmail` adapter with contract tests
- [ ] `ConsoleTransactionalEmail` adapter for local dev
- [ ] 4 email template pure functions with unit tests
- [ ] Password reset flow sends email (not returns token in response)
- [ ] Email verification flow sends email
- [ ] Registration sends welcome email
- [ ] Event registration sends confirmation email
- [ ] All 4 e2e verification tests pass
- [ ] Email send failure is non-blocking (fire-and-forget)
- [ ] `npm test`, `npm run lint`, `npm run build` all pass

## New Env Vars
| Variable | Default | Purpose |
|----------|---------|---------|
| `TRANSACTIONAL_EMAIL_PROVIDER` | `"console"` | Email backend selector |
| `TRANSACTIONAL_FROM_EMAIL` | `"noreply@localhost"` | Sender address for auth emails |

## End-of-Sprint Verification
```bash
npm test
npm run lint
npm run build
```
