# Release Checklist (Modernization)

## Pre-flight
- [ ] `npm run lint`
- [ ] `npm run test`
- [ ] `npm run build`

## Visual regression
- [ ] `npm run test:e2e`
- [ ] Visual baselines committed and visual diffs reviewed (no unexpected deltas)

## Lighthouse
- [ ] App running in production mode (`npm run build && npm run start -- --port 3000`)
- [ ] `npm run test:lighthouse` passes
- [ ] `npm run test:lighthouse:delta` reviewed (no unexpected drops)

## Bundle size
- [ ] App running in production mode (`npm run build && npm run start -- --port 3000`)
- [ ] `npm run test:bundle` passes (per-route JS gzip budgets)

## Feature flags
- [ ] Flags documented (see docs/feature-flags.md)
- [ ] Each flagged feature verified both OFF (fallback) and ON (modern)

## Docs
- [ ] Design system reviewed (docs/design-system.md)
- [ ] Icon map referenced (docs/icon-map.md)

## Rollback
- [ ] Rollback playbook reviewed (docs/rollback-playbook.md)
- [ ] Runtime feature-flag rollback path tested (if configured)

## Sign-off
- [ ] CHANGELOG updated (CHANGELOG.md)
- [ ] Sprint acceptance criteria verified
