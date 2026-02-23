# Production MVP — Operator Flows (Holistic + "Uber-simple")

**Goal:** a single integrated system that supports **community + apprenticeship + marketplace delivery + affiliates** with minimal cognitive load.

This is an **operator-flow spec**: what each role must be able to do in production, end-to-end.

Date: 2026-02-22

---

## The three home screens (the “Uber” principle)

For production simplicity, every role should land on a home screen that answers:
1) What should I do next?
2) What’s urgent?
3) What’s my status?

### 1) Client (buyer)
Primary actions:
- See clear offers and prices
- Request help (intake)
- Pay when approved
- See deliverables/status

### 2) Apprentice (provider + affiliate)
Primary actions:
- Promote (referral link/QR)
- See leads attributed to them (as affiliate)
- See assigned deals (as provider)
- Submit field reports (community→editorial)
- Track payout/commission status (readable, trustable)

### 3) Maestro/Admin (ops)
Primary actions:
- Triage intake
- Assign provider + approve deal
- Operate events + registrations + check-in
- Run money ops: refunds + ledger approvals + payouts
- Review field reports + publish newsletter
- Audit/trace any incident

---

## Loop A — Community → leads (field marketing)

**Actors:** Apprentice (as promoter), public prospects

Minimum workflow:
1) Apprentice shares a referral link / QR (attribution)
2) Prospect visits site (tracked) and submits intake
3) Intake stores referrer attribution (first-touch, 90-day window)

Pass condition:
- Attribution is visible later to ops and used for commission ledgering.

---

## Loop B — Managed marketplace delivery (revenue)

**Actors:** Maestro/Admin, Provider (apprentice), Client

Minimum workflow:
1) Intake enters queue
2) Maestro triages (risk flags)
3) Offer selected (standard SKU)
4) Provider assigned
5) Maestro approves
6) Client pays upfront
7) Provider delivers + status updated
8) Deal marked DELIVERED
9) Ledger rows created (provider + referrer + platform)
10) Approvals → payouts

Hard gates:
- No IN_PROGRESS without MAESTRO_APPROVED + PAID
- Refunds are platform-controlled; refund affects ledger/commission

Pass condition:
- You can run this loop repeatedly without spreadsheets.

---

## Loop C — Editorial flywheel (trust)

**Actors:** Apprentice, Maestro/Admin

Minimum workflow:
1) Apprentice attends event and submits a field report
2) Maestro/Admin reviews/curates
3) Newsletter issue generated/reviewed/published
4) Subscriber ops: subscribe/unsubscribe + send runs

Pass condition:
- Provenance is preserved for editorial claims.

---

## What “Uber-simple” means as acceptance criteria

Not “fewer features” — it means fewer decisions per screen.

UI acceptance criteria:
- Every role has a single entrypoint page with 3–5 primary actions.
- Every workflow has a visible state and a clear next step.
- No page requires reading a long manual to operate it.
- Money ops always show: amount, basis, who, why, and audit trail.

---

## Non-goals for production MVP

These can exist later, but must not block the three loops:
- Full assessment/scorecard productization (unless it’s already implemented as a stable surface)
- Complex booking/calendar integrations
- Multi-tier affiliate levels (this is a single-level referral program)

---

## System-spec anchors (as-is truth)

Use these to validate what exists vs what’s intended:
- `scope.md`
- `capability-map.md`
- `requirements-coverage.md`
- `ui-routes.md`
- `api-v1-methods.md`
