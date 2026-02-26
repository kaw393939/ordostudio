/**
 * Maestro-03 Intelligence & KPIs eval scenarios (3 total: F1, F3, F4)
 *
 * F1: get_content_search_analytics — surfaces top query + zero-result count
 * F3: get_ops_brief                — single-call executive summary
 * F4: empty search_analytics       — graceful zero-result handling
 *
 * NOTE: real table uses result_count + created_at (not results_n / searched_at
 *       as the spec document says).
 */

import type Database from "better-sqlite3";
import type { EvalScenario } from "../types";

// ---------------------------------------------------------------------------
// Seed helpers
// ---------------------------------------------------------------------------

function seedIntelFixtures(db: Database.Database): void {
  const searches: Array<{ q: string; n: number; daysAgo: number }> = [
    { q: "pricing",         n: 3, daysAgo: 1  },
    { q: "pricing",         n: 2, daysAgo: 3  },
    { q: "pricing",         n: 0, daysAgo: 5  },
    { q: "membership",      n: 5, daysAgo: 2  },
    { q: "membership",      n: 4, daysAgo: 8  },
    { q: "apprentice",      n: 1, daysAgo: 10 },
    { q: "unknown-xyz-abc", n: 0, daysAgo: 1  },
    { q: "unknown-xyz-abc", n: 0, daysAgo: 2  },
    { q: "workshop",        n: 6, daysAgo: 15 },
    { q: "refund policy",   n: 2, daysAgo: 20 },
    { q: "cancel",          n: 0, daysAgo: 25 },
    { q: "events",          n: 4, daysAgo: 6  },
    { q: "events",          n: 3, daysAgo: 12 },
    { q: "events",          n: 2, daysAgo: 18 },
    { q: "cost",            n: 0, daysAgo: 4  },
  ];

  const stmt = db.prepare(
    `INSERT OR IGNORE INTO search_analytics
       (id, query, result_count, created_at)
     VALUES (?, ?, ?, datetime('now', '-' || ? || ' days'))`,
  );

  searches.forEach((s, i) => {
    stmt.run(`sa-intel-${i + 1}`, s.q, s.n, s.daysAgo);
  });
}

// ---------------------------------------------------------------------------
// F1: get_content_search_analytics — top query + zero-result surfacing
// ---------------------------------------------------------------------------

export const intelF1SearchInsight: EvalScenario = {
  id: "maestro-intel-F1-search-insight",
  name: "Maestro-03 F1: search analytics — top query and zero results",
  type: "maestro",
  description:
    "Agent calls get_content_search_analytics and surfaces the top query (pricing) and the presence of zero-result searches.",
  preSetup: (db, adminId) => {
    void adminId;
    seedIntelFixtures(db);
  },
  turns: [
    {
      userMessage:
        "What are people searching for most on the site, and are there search terms returning no results?",
      expectedBehavior:
        "Agent calls get_content_search_analytics, mentions 'pricing' as the top query, and references the zero-result searches.",
      responseChecks: [
        { type: "tool_called", name: "get_content_search_analytics" },
        { type: "contains", value: "pricing" },
        {
          type: "regex",
          pattern: "no results|zero results|returning no|unknown-xyz|0 result",
          flags: "i",
        },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// F3: get_ops_brief — single-call executive summary
// ---------------------------------------------------------------------------

export const intelF3OpsBrief: EvalScenario = {
  id: "maestro-intel-F3-ops-brief",
  name: "Maestro-03 F3: get_ops_brief — full ops summary",
  type: "maestro",
  description:
    "Agent calls get_ops_brief for a broad status question and includes revenue + search sections.",
  preSetup: (db, adminId) => {
    void adminId;
    seedIntelFixtures(db);
  },
  turns: [
    {
      userMessage: "Give me a full ops brief — how are things going overall?",
      expectedBehavior:
        "Agent calls get_ops_brief and quotes the markdown summary containing revenue and search data.",
      responseChecks: [
        { type: "tool_called", name: "get_ops_brief" },
        { type: "regex", pattern: "revenue|leads|search", flags: "i" },
        {
          type: "regex",
          pattern: "last 30 days|30-day|past 30",
          flags: "i",
        },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// F4: empty search_analytics — graceful zero handling
// ---------------------------------------------------------------------------

export const intelF4EmptySearchLog: EvalScenario = {
  id: "maestro-intel-F4-empty-search-log",
  name: "Maestro-03 F4: empty search_analytics — no hallucination",
  type: "maestro",
  description:
    "When search_analytics is empty, agent reports zero gracefully without hallucinating query names.",
  preSetup: (db, adminId) => {
    void adminId;
    // intentionally do NOT seed search_analytics rows
    // delete any rows that may exist from a previous scenario in same DB run
    db.prepare("DELETE FROM search_analytics").run();
  },
  turns: [
    {
      userMessage: "What search queries have been run this month?",
      expectedBehavior:
        "Agent calls get_content_search_analytics and reports zero or no searches without inventing query names.",
      responseChecks: [
        { type: "tool_called", name: "get_content_search_analytics" },
        {
          type: "regex",
          pattern:
            "no searches|0 searches|zero|none|no data|no records|haven.t been",
          flags: "i",
        },
        { type: "not_contains", value: "pricing" },
        { type: "not_contains", value: "membership" },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Export all scenarios
// ---------------------------------------------------------------------------

export const intelScenarios: EvalScenario[] = [
  intelF1SearchInsight,
  intelF3OpsBrief,
  intelF4EmptySearchLog,
];
