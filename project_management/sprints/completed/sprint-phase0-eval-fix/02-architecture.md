# Phase 0: Eval Hotfix — Architecture

**Sprint:** `sprint-phase0-eval-fix`

---

## No DB Changes

This sprint touches zero DB tables, zero migrations. No schema impact.

---

## Files Touched

| File | Change type | Why |
|------|-------------|-----|
| `src/lib/api/agent-system-prompt.ts` | Edit (2 lines) | Remove pricing; strengthen rule 6 |
| `content/site/training.md` | Verify / patch | Source of truth for pricing |
| `content/site/services.md` | Verify / patch | Source of truth for service pricing |
| `src/evals/scenarios/intake-agent.ts` | Verify only | Confirm assertions are correct post-fix |

---

## How `content_search` Currently Works

```
User query → agent calls content_search(query) 
→ src/lib/api/content-search.ts
→ reads content/**/*.md files
→ token-frequency scoring → top N chunks
→ returns { results: [{ file, excerpt, score }] }
```

**The content files are the knowledge base.** The agent reads them via tool call at runtime. No caching, no embedding (until Vec-01). Any fact that should be answerable by the agent must exist in a content file.

---

## Content File Anatomy

Content files use frontmatter + markdown prose. Example format wanted:

```markdown
---
title: Training Programs
visibility: PUBLIC
---

## Pricing

Studio Ordo training programs are priced as follows:

- **Individual (1 person):** $3,000 – $5,000
- **Team engagement (2–12 people):** $18,000 – $24,000  
- **Enterprise / custom:** Contact us for a proposal

Pricing varies by duration, depth, and delivery format.
```

The `visibility` frontmatter field is introduced by Vec-01. For now, no frontmatter change needed — the content_search function ignores it.

---

## Why the Eval Was Failing (Causal Chain)

```
system prompt contains: "Individual pricing is $3,000–$5,000…"
                 ↓
Claude receives the fact in context window at turn 0
                 ↓
User asks: "how much does training cost?"
                 ↓
Claude answers directly — it already knows from system prompt
                 ↓
content_search is never called
                 ↓
eval assertion: tool_calls.includes('content_search') → FAIL
```

After fix:
```
system prompt says: "use content_search before stating pricing facts"
                 ↓
Claude has no inline pricing data
                 ↓
Claude is instructed to call content_search
                 ↓
content_search returns chunk from training.md with $3,000–$5,000
                 ↓
Claude answers with the sourced figure
                 ↓
eval: tool_calls.includes('content_search') → PASS
      response.includes('3,000') → PASS
```
