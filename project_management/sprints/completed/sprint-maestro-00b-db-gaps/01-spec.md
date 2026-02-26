# Maestro-00b: DB Gap Closure — Specification

**Sprint:** `sprint-maestro-00b-db-gaps`

---

## Scope

### In scope

- Migration 044: seed `ASSOCIATE`, `CERTIFIED_CONSULTANT`, `STAFF` into `roles` table
- Self-referral block: referral click route + intake creation
- Double-booking guard: `create_booking` inside DB transaction
- Stripe refund → commission void: Stripe webhook handler
- Code-level enforcement of `INVOICE_PAID` conversion type (no migration)
- Unit tests for each of the 4 bug fixes

### Out of scope

- Any UI changes
- New agent tools
- New eval scenarios (those are in Eval-01)
- The `commission_rate: 0.25` API response bug (carry to Maestro-01 T1 — it's in the referral constants area)

---

## Policy Rules Being Closed

| Rule | Description | Status before | Status after |
|------|-------------|---------------|--------------|
| Rule 1 | No double-booking a slot | ❌ Unenforced | ✅ Enforced |
| Rule 3 | Self-referral must be blocked | ❌ Unenforced | ✅ Enforced |
| Rule 8 | Commission voided on refund | ❌ Unenforced | ✅ Enforced |

---

## Role Values After This Sprint

| Name | Description | Persona |
|------|-------------|---------|
| `USER` | Base role | Public user, event attendee |
| `AFFILIATE` | Referrer | Has referral code, earns commission |
| `APPRENTICE` | Guild trainee | Under maestro supervision |
| `ASSOCIATE` | ✅ NEW — Vetted practitioner | Can take referral clients |
| `CERTIFIED_CONSULTANT` | ✅ NEW — Certified | Can teach under Studio Ordo brand |
| `STAFF` | ✅ NEW — Internal ops | Full Maestro ops agent access |
| `ADMIN` | Admin | Full system access |
| `SUPER_ADMIN` | Super admin | Infrastructure + billing access |

---

## Success Criteria

| Check | Pass condition |
|-------|---------------|
| Migration 044 | `npx tsx src/cli/cli.ts db migrate` runs cleanly |
| Roles present | `SELECT name FROM roles WHERE name IN ('ASSOCIATE', 'CERTIFIED_CONSULTANT', 'STAFF')` returns 3 rows |
| Self-referral blocked | Unit test passes; manual test: submit intake with own referral code → 4xx or silent passthrough |
| Double-booking blocked | Unit test passes; second `create_booking()` on same slot → `{ error }` |
| Commission voided | Unit test passes; mock `charge.refunded` → ledger rows status = `VOID` |
| Eval gate | `npm run evals` → still 13/13 (no regressions) |
| Unit tests | ≥ 1718 passing (4+ new) |
| Build | `npm run build` clean |
