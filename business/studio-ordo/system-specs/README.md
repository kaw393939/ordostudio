# System Specs (As-Is)

This folder is the canonical, code-verified specification of the LMS 219 platform **as it exists today**.

It is intentionally:

- **Descriptive, not aspirational** (documents what’s implemented, not what we intend)
- **Code-linked** (each spec points to the authoritative code locations)
- **Sprint-informed** (traceability back to completed sprint artifacts)


## Index

- `scope.md` — what the system does today (feature inventory)
- `architecture.md` — runtime architecture and boundaries (Next.js + API + CLI + DB)
- `api-v1.md` — API contracts + complete endpoint catalog (HAL + Problem Details)
- `api-v1-methods.md` — complete endpoint → HTTP method map
- `api-domains/README.md` — per-domain API specs (auth, offers, intake, deals, ledger, etc.)
- `auth-rbac.md` — authentication, sessions, roles, and authorization rules
- `data-model.md` — SQLite schema overview and key invariants
- `ui-routes.md` — App Router pages (public + account + admin)
- `cli-surface.md` — CLI and MCP control-plane capabilities
- `sprint-traceability.md` — sprints → code locations → test coverage (high-level)
- `capability-map.md` — normalized capability list with UI/API/CLI + test anchors
- `requirements-coverage.md` — persona/journey requirements → as-is implementation coverage (gap list)

## Update policy

- Any new endpoint, CLI command, DB table, or role rule requires updating the matching spec.
- If a spec disagrees with code, **code wins**. Update the spec immediately.

**Owner:** Keith Williams · **Last updated:** 2026-02-22
