# Maestro-00b: DB Gap Closure — QA Checklist

**Sprint:** `sprint-maestro-00b-db-gaps`

---

## Gate: All items must be checked before DONE

### DB

- [ ] `SELECT name FROM roles WHERE name IN ('ASSOCIATE','CERTIFIED_CONSULTANT','STAFF')` returns 3 rows
- [ ] `npx tsx src/cli/cli.ts db migrate` runs with no errors on fresh DB

### Policy Enforcement

- [ ] Self-referral at intake creation throws `'Self-referral not permitted'`
- [ ] Double-booking same slot returns `{ error: 'Slot is already booked' }`
- [ ] `charge.refunded` webhook voids `REFERRER_COMMISSION` and `PLATFORM_REVENUE` ledger entries

### Tests

- [ ] `npx vitest run` → ≥ 1718 passing
- [ ] `npm run evals` → 13/13 PASS (eval gate remains clean)

### Build

- [ ] `npm run build` clean, no TS errors

### Commit

- [ ] All changes committed and pushed to `origin main`
