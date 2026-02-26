# Maestro-00b: DB Gap Closure — Overview

**Sprint:** `sprint-maestro-00b-db-gaps`  
**Date:** 2026-02-26  
**Estimate:** 1 day  
**Priority:** 🔴 P0 — prerequisite for Maestro-01 (roles must exist before role tools are built)  
**Depends on:** Phase 0 (eval gate clean)  
**Next migration number:** 044

---

## What This Sprint Does

The reconciliation report (archived at `archive/sprint-maestro-00-discovery/reconciliation-report.md`) identified 5 DB-level gaps that block persona tool development:

1. **3 missing roles** — `ASSOCIATE`, `CERTIFIED_CONSULTANT`, `STAFF` are referenced in the letter.6.md spec but do not exist in the `roles` table seed data
2. **Self-referral not blocked** — an affiliate can submit their own intake and generate their own commission; policy rule 3 is unenforced
3. **Double-booking guard missing** — `create_booking` does not check if the slot is already `BOOKED`; policy rule 1 is unenforced
4. **Refund does not void commission** — Stripe `charge.refunded` webhook hits but related `ledger_entries` with `EARNED` status are not voided; policy rule 8 is unenforced
5. **`referral_conversions.conversion_type` column** — only `INTAKE_REQUEST` value exists; needs `INVOICE_PAID` to track the full referral-to-payment lifecycle

---

## Why All Together?

These are all DB-layer correctness fixes with no UI impact. Grouping them into a single migration sprint is cleaner than scattering them. Each fix is independent and could be isolated if needed, but the overhead isn't worth it at this scope.

---

## What This Unlocks

- **Maestro-01** can build role-based tools without worrying about missing role values
- **Persona-01** can gate CERTIFIED_CONSULTANT tools against the actual role
- **Persona-02** can track commission through the full lifecycle (not just intake submission)
- **Eval-01** can write policy evals that actually test enforcement (not just assert the bug exists)
