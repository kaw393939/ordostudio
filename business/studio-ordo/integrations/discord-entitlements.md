# Integration — Discord Entitlements (Future)

## Goal
Use Studio Ordo as the source of truth for paid/community access and sync entitlements to Discord roles.

## Proposed model
- Entitlements table: user_id, entitlement_key, status, source (purchase/admin).
- Discord bot:
  - reads entitlements
  - updates Discord roles

## Rollout
- Start read-only: show desired roles vs actual.
- Then enable write sync.

