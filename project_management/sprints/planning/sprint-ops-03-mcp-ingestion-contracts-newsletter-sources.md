# Sprint OPS-03 — MCP Ingestion Contracts (Meetup / YouTube / APIs)

## Goal
Standardize how apprentice-built MCP servers plug into the platform’s newsletter/research pipeline.

## Scope
- Define a stable MCP adapter contract (tool names + schemas).
- Normalize ingestion into platform entities.
- Ensure provenance is first-class.

## Deliverables
- [ ] Docs: MCP adapter contract (required fields, error handling, pagination, rate limits).
- [ ] Platform ingestion endpoint/tool that:
  - dedupes by external ID + content hash
  - stores raw payload + normalized item
  - links provenance to newsletter drafts
- [ ] Example adapter implementations:
  - meetup events
  - youtube channel transcript fetch

## Acceptance Criteria
- [ ] Ingest can run repeatedly without duplicates.
- [ ] Every ingested item has a canonical source URL.
- [ ] Newsletter draft generation can reference ingested items with provenance.
- [ ] Lint/tests/build pass.
