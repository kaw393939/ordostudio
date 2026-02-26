# Sprint 35: Content + Config Layer — Specification

## Overview
Infrastructure sprint. No user-facing UI except a staff-only settings admin page. Delivers:
1. `site_settings` table — operator-configurable key/value pairs
2. `/content/` RAG corpus — markdown files the agent searches at query time
3. `GET /api/v1/content/search` — lightweight text search endpoint for the agent
4. `GET/PATCH /api/v1/site-settings` — staff-only settings management API

## Scope

### In scope
- Migration 036: `site_settings` table with seed values
- 7 content files in `/content/`
- Content search endpoint (no external deps — term-frequency scoring)
- Settings API (get all, patch allowlisted keys)
- Staff settings page `/admin/settings`

### Out of scope
- Vector embeddings / semantic search (Sprint 36+)
- Public-facing UI changes
- Email template system

## Dependencies
- None. Builds only on existing migration pattern and DB utils.

## Success Criteria
- `site_settings` table seeded with 7 keys
- All 7 content files parseable
- `GET /api/v1/content/search?q=commission` returns ranked excerpt
- `GET/PATCH /api/v1/site-settings` auth-gated to staff/admin
- 7 tests pass, build clean
