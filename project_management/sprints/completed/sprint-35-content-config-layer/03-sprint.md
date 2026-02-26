# Sprint 35: Content + Config Layer — Sprint Plan

## Tasks

### T1: Create `site_settings` Table — Migration 036
- **File:** `src/cli/db.ts`
- **Action:** Add migration entry `036_site_settings`:
  ```sql
  CREATE TABLE IF NOT EXISTS site_settings (
    key        TEXT PRIMARY KEY,
    value      TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
  );
  INSERT OR IGNORE INTO site_settings (key, value) VALUES
    ('contact.phone',            '+1 (000) 000-0000'),
    ('contact.email',            'hello@studioordo.com'),
    ('contact.booking_url',      'https://cal.com/studioordo'),
    ('brand.name',               'Studio Ordo'),
    ('brand.tagline',            'Bring order to AI in software delivery.'),
    ('commission.rate_pct',      '20'),
    ('guild.affiliate_min_payout_usd', '50');
  ```
- **Then:** Run `APPCTL_DB_FILE=./data/app.db npm run cli -- db migrate`

---

### T2: Create `/content/` Markdown Files
- **Directory:** `/content/` at project root
- **Files to create:**
  - `content/site/about.md`
  - `content/site/services.md`
  - `content/site/guild.md`
  - `content/site/faq.md`
  - `content/site/training.md`
  - `content/policies/commission.md`
  - `content/policies/onboarding.md`
- **Rules:** Plain markdown. Single `#` heading. Factual only. Max 2000 words each.

---

### T3: Create Content Search Library + API Route
- **File 1:** `src/lib/api/content-search.ts`
  - Export `searchContent(query: string, limit = 5): Promise<ContentResult[]>`
  - Reads all `.md` files from `content/` using `fs.readdirSync` recursively
  - Splits each file into ~300-word chunks
  - Scores chunks by term-frequency against query tokens
  - Returns `{ file, heading, excerpt, score }` array sorted descending by score
- **File 2:** `src/app/api/v1/content/search/route.ts`
  - `GET` handler — requires no auth (internal, public-safe)
  - Query param: `q` (string, required), `limit` (number, default 5)
  - Returns `{ results: ContentResult[] }`
  - 400 if `q` is missing or empty

---

### T4: Create Site Settings API Routes
- **File 1:** `src/lib/api/site-settings.ts`
  - Export `getSiteSettings(db): Record<string, string>`
  - Export `setSiteSetting(db, key: string, value: string): void`
  - Export `ALLOWED_KEYS: string[]` — the 7 seed keys only
- **File 2:** `src/app/api/v1/site-settings/route.ts`
  - `GET` — requires staff/admin session. Returns all settings as `{ settings: Record<string, string> }`.
  - `PATCH` — requires staff/admin session. Body: `Record<string, string>`. Validates all keys are in `ALLOWED_KEYS`. Updates each. Returns updated settings.
  - 401 if not authenticated, 403 if not staff/admin, 422 if unknown key in PATCH body.

---

### T5: Create Staff Settings Page
- **File:** `src/app/(admin)/settings/page.tsx`
- **"use client"** — inline editing requires client state
- On mount: `GET /api/v1/site-settings`
- Render table with one row per key
- On blur for each input: `PATCH /api/v1/site-settings` with single changed key
- Visual feedback: green border on success, red + error text on failure

---

### T6: Write Tests
- **File:** `src/app/__tests__/e2e-content-config.test.ts`
- **7 tests:**
  1. `site_settings` migration creates table and seed data
  2. `GET /api/v1/site-settings` returns 401 without session
  3. `GET /api/v1/site-settings` returns all settings for admin session
  4. `PATCH /api/v1/site-settings` updates a value
  5. `PATCH /api/v1/site-settings` returns 422 for unknown key
  6. `searchContent('commission')` returns result with excerpt from `policies/commission.md`
  7. `searchContent('unmatchable_gibberish_xyz')` returns empty array (not error)
