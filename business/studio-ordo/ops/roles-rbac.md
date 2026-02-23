# Studio Ordo — Roles & Access Model

This document defines **organizational roles** (business meaning) and **system roles** (RBAC).

## Business roles
- **Client**: buys an offer, receives service.
- **Apprentice**: independent contractor delivering services under Studio Ordo supervision.
- **Maestro**: senior independent contractor providing supervision, assignment, review, and approval.
- **Admin/Ops**: operational staff (may overlap with maestro).

## System roles (RBAC)
Start with coarse-grained roles; use record ownership for finer controls.

- **USER**: authenticated user.
- **APPRENTICE**: can manage their profile, view assigned deals, submit field reports, view their ledger summaries.
- **MAESTRO**: can triage intake, assign/approve deals, review/feature field reports, review/publish newsletters, approve payouts.
- **ADMIN**: can manage users, offers/pricing, refunds, global settings, audit logs.
- **SUPER_ADMIN**: break-glass access.

## Access principles
- Principle of least privilege.
- Every mutation writes audit entries.
- Money operations require elevated roles + confirmation flows.

## Canonical permissions (MVP)
### Intake + deals
- APPRENTICE: view deals assigned to them; update delivery status; add notes/artifacts.
- MAESTRO: triage intake; assign provider; approve deals; pause/escalate; approve completion.
- ADMIN: refund decisions; override assignment; manage offer catalog.

### Field reports + newsletter
- APPRENTICE: create field reports and view own reports.
- MAESTRO/ADMIN: list/review/feature; generate newsletter; review/publish.

### Payments + ledgers
- APPRENTICE: read-only payouts/commission summaries.
- MAESTRO: approve earned rows (if delegated).
- ADMIN: execute payouts, process refunds.

## Identity notes
- Keith Williams' LLC is the platform operator; assign ADMIN/SUPER_ADMIN to the smallest set of humans.

