/**
 * Vec-01 content-retrieval eval scenarios
 *
 * V1 — semantic pricing: agent finds pricing via vector similarity
 * V2a — RBAC public: public caller cannot see AUTHENTICATED commission content
 * V2b — RBAC affiliate: AFFILIATE caller can see commission content
 * V3 — zero results graceful: agent does not fabricate when no content matches
 * V4 — search analytics logged: every content_search writes search_analytics row
 *
 * These scenarios require:
 *   ANTHROPIC_API_KEY    (for Claude agent loop)
 *   OPENAI_API_KEY       (for content embedding / vectorSearch)
 *
 * All preSetup hooks call indexContentCorpus() which is idempotent — content
 * is only re-indexed if the embeddings table is empty.
 */

import type { EvalScenario } from "../types";
import type Database from "better-sqlite3";
import { indexContentCorpus } from "../../lib/vector/indexer";

// ---------------------------------------------------------------------------
// Shared preSetup: ensure embeddings table is populated
// ---------------------------------------------------------------------------

async function ensureIndexed(db: Database): Promise<void> {
  // Force re-index for eval source so analytics baseline is fresh
  await indexContentCorpus(db, process.cwd(), "eval");
}

// ---------------------------------------------------------------------------
// Scenarios
// ---------------------------------------------------------------------------

export const contentRetrievalScenarios: EvalScenario[] = [
  // ---------------------------------------------------------------------------
  // V1 — Semantic pricing
  // ---------------------------------------------------------------------------
  {
    id: "content-retrieval-semantic-pricing",
    name: "Semantic search finds pricing even with paraphrased query",
    type: "content-retrieval",
    description:
      "Agent finds $3,000–$5,000 cohort pricing when user asks about 'fees' — " +
      "demonstrating semantic retrieval over keyword matching.",
    userRole: null,
    preSetup: ensureIndexed,
    turns: [
      {
        userMessage: "What are the fees for your programs?",
        expectedBehavior:
          "Agent calls content_search and returns pricing from training.md (~$3,000–$5,000).",
        responseChecks: [
          { type: "tool_called", name: "content_search" },
          { type: "contains", value: "3,000", description: "Must cite pricing" },
        ],
      },
    ],
    dbAssertions: [
      {
        description: "Search analytics row logged for this eval query",
        query:
          "SELECT COUNT(*) AS result FROM search_analytics WHERE source = 'intake-agent' AND query LIKE '%fee%'",
        expected: { result: 1 },
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // V2a — RBAC: public caller cannot see AUTHENTICATED commission content
  // ---------------------------------------------------------------------------
  {
    id: "content-retrieval-rbac-public",
    name: "RBAC gating: PUBLIC caller cannot see AUTHENTICATED commission content",
    type: "content-retrieval",
    description:
      "Anonymous caller asks about commission rate; commission.md is AUTHENTICATED " +
      "visibility so agent should NOT return the 20% rate.",
    userRole: null,
    preSetup: ensureIndexed,
    turns: [
      {
        userMessage: "What is the commission rate for affiliates?",
        expectedBehavior:
          "Agent calls content_search but the commission.md is not returned " +
          "for a public caller, so agent does not cite 20%.",
        responseChecks: [
          { type: "tool_called", name: "content_search" },
          {
            type: "not_contains",
            value: "20%",
            description: "Commission % must not appear for public caller",
          },
        ],
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // V2b — RBAC: AFFILIATE caller CAN see AUTHENTICATED commission content
  // ---------------------------------------------------------------------------
  {
    id: "content-retrieval-rbac-affiliate",
    name: "RBAC gating: AFFILIATE caller can see AUTHENTICATED commission content",
    type: "content-retrieval",
    description:
      "Authenticated AFFILIATE caller asks about commission rate; commission.md " +
      "is AUTHENTICATED visibility and should be returned.",
    userRole: "AUTHENTICATED",
    preSetup: ensureIndexed,
    turns: [
      {
        userMessage: "What is the commission rate at Studio Ordo?",
        expectedBehavior:
          "Agent calls content_search and returns commission.md contents, " +
          "citing the 20% rate.",
        responseChecks: [
          { type: "tool_called", name: "content_search" },
          {
            type: "contains",
            value: "20",
            description: "Commission rate must appear for authenticated caller",
          },
        ],
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // V3 — Zero results graceful handling
  // ---------------------------------------------------------------------------
  {
    id: "content-retrieval-zero-results-graceful",
    name: "Agent does not fabricate when content_search returns empty",
    type: "content-retrieval",
    description:
      "Query about refund policy for an unrelated topic produces no results; " +
      "agent must acknowledge the gap rather than inventing an answer.",
    userRole: null,
    preSetup: ensureIndexed,
    turns: [
      {
        userMessage:
          "What is the refund policy for quantum computing courses?",
        expectedBehavior:
          "Agent calls content_search, finds nothing relevant, and tells the " +
          "user it does not have that information.",
        responseChecks: [
          { type: "tool_called", name: "content_search" },
          {
            type: "not_contains",
            value: "refund policy is",
            description: "Must not fabricate a policy",
          },
          // Agent must acknowledge that the information isn't available
        ],
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // V4 — Search analytics logging
  // ---------------------------------------------------------------------------
  {
    id: "content-retrieval-search-analytics-logged",
    name: "Every content_search call writes a search_analytics row",
    type: "content-retrieval",
    description:
      "Verifies that vectorSearch logs every query to search_analytics, " +
      "regardless of result count.",
    userRole: null,
    preSetup: async (db: Database) => {
      await ensureIndexed(db);
      // Clear prior eval analytics rows to get a clean count
      db.prepare(
        "DELETE FROM search_analytics WHERE source = 'intake-agent' AND query LIKE '%guild%'",
      ).run();
    },
    turns: [
      {
        userMessage: "Tell me about the guild hierarchy at Studio Ordo.",
        expectedBehavior:
          "Agent calls content_search; guild.md returns relevant results; " +
          "a row is logged to search_analytics.",
        responseChecks: [{ type: "tool_called", name: "content_search" }],
      },
    ],
    dbAssertions: [
      {
        description: "Search analytics row exists for guild query",
        query:
          "SELECT COUNT(*) AS result FROM search_analytics WHERE query LIKE '%guild%'",
        expected: { result: 1 },
      },
    ],
  },
];
