# API Domain: Newsletter

**Owner:** Keith Williams · **Last updated:** 2026-02-22

Canonical sources:

- Public routes: `src/app/api/v1/newsletter/**/route.ts`
- Admin routes: `src/app/api/v1/admin/newsletter/**/route.ts`
- Business logic: `src/lib/api/newsletter.ts`
- CLI dispatch: `src/cli/newsletter.ts` (`newsletter dispatch-due`)

---

## Public endpoints

### Subscribe

- `POST /api/v1/newsletter/subscribe`
- Schema: `subscribeSchema`

Controls:

- CSRF: same-origin mutation check
- Rate limit bucket: `public:write`
- Cache: `no-store`

### Unsubscribe

- `POST /api/v1/newsletter/unsubscribe`

---

## Admin endpoints

All admin endpoints require `ADMIN` or `SUPER_ADMIN`.

### List issues

- `GET /api/v1/admin/newsletter`
- Cache: `no-store`

### Create issue

- `POST /api/v1/admin/newsletter`
- Schema: `createNewsletterSchema`

### Issue detail

- `GET /api/v1/admin/newsletter/{id}`
- `PATCH /api/v1/admin/newsletter/{id}`

### Generate

- `POST /api/v1/admin/newsletter/{id}/generate`

### Review

- `POST /api/v1/admin/newsletter/{id}/review`

### Schedule

- `POST /api/v1/admin/newsletter/{id}/schedule`

### Publish

- `POST /api/v1/admin/newsletter/{id}/publish`

### Export

- `GET /api/v1/admin/newsletter/{id}/export`

### Send runs

- `GET /api/v1/admin/newsletter/{id}/send-runs`

---

## Notes

- The API supports editorial workflow (create → generate → review → schedule → publish).
- Actual sending is bridged through the platform job queue and the CLI dispatch command.
