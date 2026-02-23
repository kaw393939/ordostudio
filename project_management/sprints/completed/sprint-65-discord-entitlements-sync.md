# Sprint 65 — Discord Entitlements + Role Sync (Optional)

## Goal
Make the platform the source of truth for community access and sync entitlements to Discord roles.

## Scope
- Entitlements model (user → entitlement_key → status).
- Admin console to grant/revoke entitlements.
- Discord bot sync (read-only diff first; write sync second).

## Acceptance Criteria

- [x] Entitlements exist and can be managed by admins.
- [x] Discord sync can map entitlements → roles.
- [x] Audit entries exist for entitlement changes.
- [x] Lint/tests/build pass.

## Shipped
- Migration `019_entitlements_discord_sync` (entitlements + Discord linking)
- Domain: `src/lib/api/entitlements.ts`, `src/lib/api/entitlements-discord-sync.ts`
- Integrations: `src/lib/integrations/discord-client.ts`
- Admin API:
	- `GET/POST /api/v1/admin/entitlements`
	- `POST /api/v1/admin/entitlements/discord-link`
	- `GET/POST /api/v1/admin/entitlements/discord-sync`
- Admin UI: `/admin/entitlements`
- Tests: `src/app/__tests__/e2e-entitlements.test.ts`

