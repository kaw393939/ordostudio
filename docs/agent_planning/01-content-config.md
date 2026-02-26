# Sprint 35 — Content + Config Layer

**Status:** Planning · **Date:** 2026-02-25
**Prerequisite:** None — builds on existing DB migration pattern
**Delivers to:** Sprint 36 (agent needs RAG corpus and site_settings to answer questions)

---

## What This Sprint Is

Before the agent can answer a single question, two things must exist:

1. **A RAG corpus** — structured markdown files in `/content/` that the agent searches at query time. Update a file → agent immediately knows. No embeddings, no external vector store.
2. **A `site_settings` table** — operator-configurable key/value pairs. Phone number, email, social handles. The agent reads from here instead of having any values hardcoded.

This sprint has no user-facing UI beyond a staff-only settings admin page. It is infrastructure.

---

## What's Broken Now

| Issue | Impact |
|-------|--------|
| Business phone number, email, and social links hardcoded in multiple components | Changing a phone number requires a code deploy |
| Agent has no knowledge base to draw from | Zero RAG capability without this sprint |
| No single-source-of-truth for site copy | Content drift between pages is impossible to audit or fix systematically |
| Intake form has no pre-loaded context to guide an agent | Agent cannot submit a well-formed intake without structured content to reason from |

---

## Data Model

### `site_settings` (new table — migration 036)

```sql
CREATE TABLE site_settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
```

**Seed values (inserted in migration):**

| key | value |
|-----|-------|
| `contact.phone` | `+1 (000) 000-0000` |
| `contact.email` | `hello@studioordo.com` |
| `contact.booking_url` | `https://cal.com/studioordo` |
| `brand.name` | `Studio Ordo` |
| `brand.tagline` | `Bring order to AI in software delivery.` |
| `commission.rate_pct` | `20` |
| `guild.affiliate_min_payout_usd` | `50` |

---

## Content File Structure

```
/content/
  site/
    about.md           ← who Studio Ordo is, founding story, mission
    services.md        ← what the studio does, pricing tiers
    guild.md           ← Affiliate/Apprentice/Journeyman/Maestro explained
    faq.md             ← common prospect questions with direct answers
    training.md        ← Maestro Training program: format, cost, outcomes
  policies/
    commission.md      ← 20% commission rate, how payouts work, eligibility
    onboarding.md      ← what new members receive, timeline, expectations
```

**Rules for content files:**
- Plain markdown only. No JSX, no HTML, no front-matter required.
- Each file must have a single `#` heading that matches the filename intent.
- Factual claims only. No marketing fluff — the agent reads these verbatim.
- Maximum file size: 2000 words. If longer, split into two files.
- The `/content/` directory is git-managed. Changes ship with code deploys.

---

## API Routes

### `GET /api/v1/content/search`

Used internally by the agent. Not publicly documented. Returns ranked chunks from `/content/` matching a query string.

**Request:**
```
GET /api/v1/content/search?q=commission+rate&limit=3
```

**Response:**
```json
{
  "results": [
    {
      "file": "policies/commission.md",
      "heading": "Commission Rate",
      "excerpt": "Studio Ordo takes 20% of all guild project work...",
      "score": 0.94
    }
  ]
}
```

**Implementation:** Read all `.md` files from `/content/`, split into ~300-word chunks, score each chunk against the query using term frequency. No external dependencies.

---

### `GET /api/v1/site-settings`

Staff-only (requires session with `role IN ('admin', 'staff')`). Returns all key/value pairs.

### `PATCH /api/v1/site-settings`

Staff-only. Updates one or more keys. Validates against an allowlist — arbitrary keys cannot be created via API.

**Request:**
```json
{ "contact.phone": "+1 (555) 123-4567" }
```

---

## UI

### Staff settings page — `/admin/settings`

Simple two-column table: key / value / edit button. No custom form — an inline text input per row is sufficient. Validates on blur.

No public-facing UI changes in this sprint.

---

## Test Plan

| # | Test | Type |
|---|------|------|
| T1 | `site_settings` migration inserts seed values | unit |
| T2 | `GET /api/v1/site-settings` requires staff auth | unit |
| T3 | `PATCH /api/v1/site-settings` updates a value and reflects in next GET | unit |
| T4 | `PATCH /api/v1/site-settings` rejects unknown keys | unit |
| T5 | `GET /api/v1/content/search?q=commission` returns a relevant excerpt | unit |
| T6 | Content search returns empty array for unmatchable query (not 404) | unit |
| T7 | All content files parse without error (no broken markdown) | unit |

---

## Definition of Done

- [ ] Migration 036 applied to `data/app.db`
- [ ] Seed values present in DB
- [ ] `/content/` directory present with all 7 files
- [ ] `GET /api/v1/content/search` returns ranked results
- [ ] `GET/PATCH /api/v1/site-settings` functional and auth-gated
- [ ] All 7 tests pass
- [ ] `npm run build` clean
