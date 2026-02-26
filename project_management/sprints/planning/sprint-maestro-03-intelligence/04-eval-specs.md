# Sprint Maestro-03: Intelligence & KPIs v2 — Eval Specs

Eval file: `src/evals/maestro-intel.eval.ts`
Seed helper: `src/evals/fixtures/intel-seeds.ts`

**Evals in this sprint: 3 (F1, F3, F4)**
**Deferred: F2** (`maestro-intel-F2-funnel-velocity` — with `get_funnel_velocity`)

---

## Seed Helper: `intel-seeds.ts`

```typescript
export function seedIntelFixtures(db: Database) {
  // 15 search analytics rows over the last 35 days
  const searches = [
    { query: "pricing",          results_n: 3, days_ago: 1 },
    { query: "pricing",          results_n: 2, days_ago: 3 },
    { query: "pricing",          results_n: 0, days_ago: 5 },  // zero hit
    { query: "membership",       results_n: 5, days_ago: 2 },
    { query: "membership",       results_n: 4, days_ago: 8 },
    { query: "apprentice",       results_n: 1, days_ago: 10 },
    { query: "unknown-xyz-abc",  results_n: 0, days_ago: 1 },  // zero hit
    { query: "unknown-xyz-abc",  results_n: 0, days_ago: 2 },  // zero hit
    { query: "workshop",         results_n: 6, days_ago: 15 },
    { query: "refund policy",    results_n: 2, days_ago: 20 },
    { query: "cancel",           results_n: 0, days_ago: 25 },
    { query: "events",           results_n: 4, days_ago: 6 },
    { query: "events",           results_n: 3, days_ago: 12 },
    { query: "events",           results_n: 2, days_ago: 18 },
    { query: "cost",             results_n: 0, days_ago: 4 },  // zero hit
  ];

  for (const s of searches) {
    db.prepare(`
      INSERT INTO search_analytics (id, query, results_n, searched_at)
      VALUES (randomblob(16), ?, ?, datetime('now', '-' || ? || ' days'))
    `).run(s.query, s.results_n, s.days_ago);
  }
}
```

---

## Eval F1: `search-insight-query`

**Goal**: Agent uses `get_content_search_analytics` and surfaces the top query
and count of zero-result searches.

```typescript
{
  id: "maestro-intel-F1-search-insight",
  description: "Agent reports top search query and zero-result count",
  preSetup: (db) => seedIntelFixtures(db),
  turns: [
    {
      role: "user",
      content: "What are people searching for most on the site, and are there search terms returning no results?",
    },
  ],
  assertions: [
    {
      type: "tool-called",
      toolName: "get_content_search_analytics",
    },
    {
      type: "content-contains",
      substring: "pricing",  // top query by count (3 hits)
    },
    {
      type: "content-contains",
      substring: "no results",
      alternates: ["zero results", "returning no", "unknown-xyz"],
    },
  ],
},
```

---

## Eval F3: `ops-brief-single-call`

**Goal**: When asked a broad status question, agent calls `get_ops_brief` and
includes at least revenue and search sections in its reply.

```typescript
{
  id: "maestro-intel-F3-ops-brief",
  description: "Agent calls get_ops_brief for broad status question",
  preSetup: (db) => seedIntelFixtures(db),
  turns: [
    {
      role: "user",
      content: "Give me a full ops brief — how are things going overall?",
    },
  ],
  assertions: [
    {
      type: "tool-called",
      toolName: "get_ops_brief",
    },
    {
      type: "content-matches-regex",
      pattern: /revenue|leads|search/i,
    },
    {
      type: "content-contains",
      substring: "last 30 days",
      alternates: ["30-day", "past 30"],
    },
  ],
},
```

---

## Eval F4: `empty-search-log-graceful`

**Goal**: When `search_analytics` is empty, agent does not crash or hallucinate
numbers; it reports zero searches gracefully.

```typescript
{
  id: "maestro-intel-F4-empty-search-log",
  description: "Empty search_analytics returns zero gracefully — no hallucination",
  preSetup: (db) => {
    // intentionally do NOT seed search_analytics rows
  },
  turns: [
    {
      role: "user",
      content: "What search queries have been run this month?",
    },
  ],
  assertions: [
    {
      type: "tool-called",
      toolName: "get_content_search_analytics",
    },
    {
      type: "content-matches-regex",
      pattern: /no searches|0 searches|zero|none|no data|no records/i,
    },
    {
      type: "content-not-contains",
      substring: "pricing",
    },
    {
      type: "content-not-contains",
      substring: "membership",
    },
  ],
},
```

---

## Deferred: F2 `funnel-velocity-query`

This eval tests `get_funnel_velocity` which is deferred to M-03b. The scenario
spec is preserved in `sprint-maestro-01b-extended/04-eval-specs.md`.
