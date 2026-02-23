# Studio Ordo — Start Here (Production MVP)

This folder contains a lot of material. For operating the **production MVP**, you only need a small subset.

## Production-core (read these first)

**As-is system truth (code-verified):**
- `system-specs/README.md`
- `system-specs/scope.md`
- `system-specs/capability-map.md`
- `system-specs/requirements-coverage.md`

**Production MVP operator flows (holistic, role-based):**
- `system-specs/production-mvp-operator-flows.md`

**How the business runs (what must work in production):**
- `ops/operating-model.md`
- `product/marketplace-workflows.md`
- `product/deal-lifecycle.md`
- `product/offer-catalog.md`

**Policies that affect real operations:**
- `policies/refunds-disputes.md`
- `policies/pricing-policy.md`
- `policies/security-privacy-baseline.md`
- `policies/affiliate-commission-policy.md`

**Integrations (operationally relevant):**
- `integrations/stripe-connect.md`
- `integrations/email-delivery.md`
- `integrations/mcp-server.md`

## What “production MVP” means here

Two loops must run end-to-end:
1) Managed marketplace delivery: intake → deal → approve → pay → deliver → ledger → payout/refund (audited)
2) Editorial flywheel: events → field reports → newsletter → trust → leads

## Everything else

Everything else in this folder is either:
- reference material (brand/marketing writing),
- future-phase specs,
- or workshop/community content.

We keep it, but we treat it as **non-blocking** for operating the MVP.
