# MCP Ingestion Contract

This document defines the standard contract for apprentice-built MCP servers to plug into the platform's newsletter/research pipeline.

## Overview

The platform provides an ingestion endpoint that allows external sources (e.g., Meetup, YouTube, RSS feeds) to be ingested into the platform. These ingested items can then be referenced in newsletter drafts, providing a clear provenance trail.

## Ingestion Endpoint

The ingestion endpoint is exposed via the `ingest_item` MCP tool.

### Tool: `ingest_item`

**Description:** Ingest an item from an external source into the platform.

**Input Schema:**

```json
{
  "type": "object",
  "properties": {
    "sourceType": {
      "type": "string",
      "description": "The type of the source (e.g., 'meetup', 'youtube', 'rss')."
    },
    "externalId": {
      "type": "string",
      "description": "A unique identifier for the item within the source system."
    },
    "canonicalUrl": {
      "type": "string",
      "description": "The canonical URL of the item."
    },
    "title": {
      "type": "string",
      "description": "The title of the item."
    },
    "summary": {
      "type": "string",
      "description": "A brief summary of the item."
    },
    "rawPayload": {
      "type": "object",
      "description": "The raw payload received from the source system."
    },
    "normalizedPayload": {
      "type": "object",
      "description": "A normalized representation of the item, suitable for use in newsletter drafts."
    }
  },
  "required": [
    "sourceType",
    "externalId",
    "canonicalUrl",
    "title",
    "rawPayload",
    "normalizedPayload"
  ]
}
```

### Deduplication

The platform dedupes ingested items based on the combination of `sourceType` and `externalId`. If an item with the same `sourceType` and `externalId` already exists, the platform will update the existing item if the `contentHash` (computed from the `rawPayload`) has changed.

### Error Handling

If the ingestion fails, the tool will return an error response with a descriptive message. Common errors include:

- `invalid_input`: The input payload does not conform to the schema.
- `unauthorized`: The actor does not have permission to ingest items.

### Pagination and Rate Limits

When fetching data from external sources, adapters should implement appropriate pagination and rate limiting to avoid overwhelming the source system. The platform itself does not enforce rate limits on the `ingest_item` tool, but adapters should be mindful of the platform's overall performance.

## Linking Provenance

Ingested items can be linked to newsletter drafts using the `attach_ingested_item_to_newsletter` MCP tool.

### Tool: `attach_ingested_item_to_newsletter`

**Description:** Attach an ingested item to a newsletter issue.

**Input Schema:**

```json
{
  "type": "object",
  "properties": {
    "issueId": {
      "type": "string",
      "description": "The ID of the newsletter issue."
    },
    "ingestedItemId": {
      "type": "string",
      "description": "The ID of the ingested item."
    },
    "tag": {
      "type": "string",
      "description": "The section of the newsletter where the item should be featured (e.g., 'MODELS', 'MONEY', 'PEOPLE', 'FROM_FIELD')."
    }
  },
  "required": [
    "issueId",
    "ingestedItemId"
  ]
}
```

## Example Adapters

Example adapter implementations can be found in `src/mcp/adapters/`:

- `meetup.ts`: Fetches events from a Meetup group.
- `youtube.ts`: Fetches transcripts from a YouTube channel.
