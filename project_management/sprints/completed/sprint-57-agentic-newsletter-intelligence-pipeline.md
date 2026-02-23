# Sprint 57 — Agentic Newsletter + Intelligence Pipeline (Editorial)

## Goal
Publish an “Ordo Brief” newsletter powered by:
- student field reports
- curated event research
- structured weekly synthesis: Models / Money / People

## Scope

### Content model
- Define a newsletter issue schema.
- Ingest field reports and tag them.

Newsletter template (Fortune-100 editorial feel):
- Title + issue date
- Sections (repeatable): Models / Money / People
- “From the field” (student reports)
- “What to do next” (actions for CTOs / engineers)

Content rules:
- Clear headings; scan-first bullet blocks.
- No anonymous claims: link every claim to provenance.

### Agentic synthesis (guardrailed)
- Generate drafts with clear provenance:
  - what came from field reports
  - what came from research

Provenance UX requirements:
- Each paragraph or bullet group includes provenance metadata:
  - Field report link(s) and/or research source list
- Generated content must be editable without losing provenance.

### Editorial workflow
- Admin review/edit/publish.
- Export to markdown or email provider format.

Editorial UI standards:
- Review screen reads like a document editor (not a raw JSON view).
- Show “draft → reviewed → published” status.
- Publishing requires a final confirmation (no accidental send).

## Acceptance Criteria
- [x] Newsletter issue model exists.
- [x] Draft generation produces structured content.
- [x] Admin can edit and publish.
- [x] Provenance is visible and preserved.
- [x] Export output matches the canonical template.
- [x] Tests cover generation + publishing guardrails.
- [x] Lint/tests/build pass.
