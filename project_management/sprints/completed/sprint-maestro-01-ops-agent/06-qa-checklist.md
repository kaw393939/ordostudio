# Maestro-01: Ops Agent (v2) — QA Checklist

**Sprint:** `sprint-maestro-01-ops-agent`

---

## Gate: All items must be checked before DONE

### Route Auth

- [ ] `POST /api/v1/agent/maestro` without session → 401
- [ ] With USER-only session → 403
- [ ] With ADMIN session → 200 streaming response

### Tools

- [ ] `MAESTRO_TOOLS.length === 25` (count verified in test or console)
- [ ] Every tool rejects `{}` with `{ error }` (no uncaught throw)
- [ ] All write tools wrapped in `db.transaction()`
- [ ] `approve_role_request` writes feed event `RoleApproved`
- [ ] `reject_role_request` writes feed event `RoleRejected`
- [ ] `update_intake_status` writes feed event `IntakeStatusChanged`
- [ ] `cancel_availability_slot` returns `{ error }` when slot is BOOKED

### Feed Event Expansion

- [ ] `createIntakeRequest()` writes `NewIntakeRequest` feed event
- [ ] Deal close path writes `DealClosed` feed event
- [ ] Stripe `payment_intent.succeeded` writes `PaymentReceived` feed event
- [ ] `scheduleNewsletter()` writes `NewsletterScheduled` feed event
- [ ] `createBooking()` writes `BookingCreated` feed event

### Bug Fix

- [ ] `GET /api/v1/account/referral` response body: `commission_rate === 0.04`

### Evals

- [ ] `npm run evals:maestro` → 18/18 PASS
- [ ] `npm run evals` → 35/35 PASS

### Tests

- [ ] `npx vitest run` → ≥ 1740 passing

### Build

- [ ] `npm run build` clean, no TypeScript errors

### Commit

- [ ] All changes committed and pushed to `origin main`
