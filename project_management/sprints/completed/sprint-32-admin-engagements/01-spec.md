# Sprint 32: Admin Engagements Module

## 1. Problem Statement

The Admin Engagements section currently shows a stub: `"No engagements dashboard yet"`. This means:
- Project commission revenue is not tracked
- Maestro Training enrollments are not tracked
- The ledger has no source of truth for `PLATFORM_REVENUE` entries
- The `REFERRER_COMMISSION` ledger entries cannot be triggered by project completion

From `GA-05-admin-operator-flow.md`:
> "Engagements is the most critical missing admin module. Without it, the 20% commission model is operationally invisible."

Studio Ordo's revenue model has two streams:
1. **Project Commissions** — client commissions a project, Studio Ordo charges a management fee (20% of project value), Journeyman(s) do the build
2. **Maestro Training** — individual enrollment, cohort-based, $3K–$5K for cohort or $1,500–$2,500/mo for advisory

Both need tracking. Both need ledger linkage.

**Sprint 32 is independent.** No dependency on any other sprint in this sequence. Can be built at any time in parallel with Sprints 24–31.

---

## 2. Acceptance Criteria

| # | Criterion |
|---|-----------|
| 1 | Admin Engagements page renders with real data (not the stub). |
| 2 | Project Commission records display: client name, project type, total project value, 20% commission amount, payment status. |
| 3 | Maestro Training enrollment records display: student name, cohort start date, track (cohort / advisory), payment status. |
| 4 | New engagement can be created from the admin UI. |
| 5 | Engagement can be marked as "Completed". |
| 6 | Marking a project engagement as "Completed" auto-generates a `PLATFORM_REVENUE` ledger entry. |
| 7 | Marking a project engagement as "Completed" with a `referral_code` on record auto-generates a `REFERRER_COMMISSION` ledger entry (20% of commission amount). |
| 8 | Maestro Training enrollment marked as "Completed" auto-generates a `PLATFORM_REVENUE` ledger entry. |
| 9 | `npm run build` succeeds and all tests pass. |

---

## 3. Decisions

1. **Commission math is hardcoded at 20%.** Do not build a variable commission rate. The rate is 20%. If it ever changes, it changes in one place in the code.

2. **Ledger auto-generation on Completion.** The ledger write is triggered by a status change to "Completed" — either via a server action, API route, or database trigger. The two entries created are: `PLATFORM_REVENUE` (Studio Ordo's take) and, if a `referral_code` exists on the engagement record, `REFERRER_COMMISSION` (the affiliate's 20% of Studio Ordo's take — i.e., 20% of 20% of project value, or 4% of total project value). Or, if model is "20% of commission": the affiliate gets 20% of Studio Ordo's fee = 20% × 20% = 4% of total project value. Verify the commission-of-commission model with the product owner before building ledger entries.

3. **Engagement types are scoped to two.** Project Commission and Maestro Training. Do not generalize this into a configurable "engagement type" system yet. Two tables or two views, concrete implementation.

4. **Phase 1 is CRUD + ledger triggers.** Reporting and analytics are out of scope for Sprint 32. The goal is: engagements exist, can be tracked, and feed the ledger. Dashboards and charts are a future sprint.
