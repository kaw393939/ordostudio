# Sprint 35: Content + Config Layer — QA Checklist

## Pre-merge checks

### Database
- [ ] Migration 036 present in `src/cli/db.ts`
- [ ] `APPCTL_DB_FILE=./data/app.db npm run cli -- db migrate` runs without error
- [ ] `site_settings` table exists with 7 rows in `data/app.db`
- [ ] All 7 seed keys and values are correct (verify with sqlite3 directly)

### Content Files
- [ ] `/content/site/about.md` exists and has a `#` heading
- [ ] `/content/site/services.md` exists and has a `#` heading
- [ ] `/content/site/guild.md` exists and has a `#` heading
- [ ] `/content/site/faq.md` exists and has a `#` heading
- [ ] `/content/site/training.md` exists and has a `#` heading
- [ ] `/content/policies/commission.md` exists and has a `#` heading
- [ ] `/content/policies/onboarding.md` exists and has a `#` heading

### API
- [ ] `GET /api/v1/content/search?q=commission` returns `results` array
- [ ] `GET /api/v1/content/search` (no `q`) returns 400
- [ ] `GET /api/v1/site-settings` without auth returns 401
- [ ] `GET /api/v1/site-settings` with admin session returns 7 keys
- [ ] `PATCH /api/v1/site-settings` with `{"contact.phone": "+1 555 0000"}` updates DB
- [ ] `PATCH /api/v1/site-settings` with `{"unknown.key": "val"}` returns 422

### UI
- [ ] `/admin/settings` renders the settings table
- [ ] Changing a value and blurring persists the update

### Tests
- [ ] `npx vitest run` — all tests pass (previous count + 7 new)
- [ ] No test file imports from a path that doesn't exist

### Build
- [ ] `npm run build` exits 0
- [ ] No TypeScript errors
- [ ] No new ESLint errors
