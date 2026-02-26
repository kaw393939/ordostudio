# Phase 0: Eval Hotfix — Specification

**Sprint:** `sprint-phase0-eval-fix`  
**Date:** 2026-02-26

---

## Scope

### In scope

- `src/lib/api/agent-system-prompt.ts` — remove pricing sentence; update rule 6
- `content/site/training.md` — verify pricing is present and precise; add if missing
- `content/site/services.md` — verify pricing is present and precise; add if missing
- `src/evals/scenarios/intake-agent.ts` — confirm eval expectation is correct (tool called + correct answer)

### Out of scope

- Any other system prompt changes
- Rewriting content files beyond ensuring pricing facts are present
- Adding new tools

---

## Exact Change: System Prompt

**File:** `src/lib/api/agent-system-prompt.ts`

### Remove (from the rules section)

```
"Individual pricing is $3,000 to $5,000; team and enterprise pricing is $18,000 to $24,000."
```

### Replace rule 6 (or add if absent) with

```
"Before stating any specific fact about pricing, training syllabi, schedule, guild structure, or program requirements — you MUST call content_search. Never quote figures from memory."
```

**Do not change** the tone, persona, opening message, or any other rule.

---

## Exact Change: Content Files

**File:** `content/site/training.md`  
Ensure these facts appear verbatim (agent quotes them):
```
Individual training: $3,000–$5,000
Team engagements: $18,000–$24,000
Enterprise: contact for pricing
```

**File:** `content/site/services.md`  
Ensure a cross-reference to training.md pricing or duplicate the relevant pricing block. The agent must be able to answer a pricing question with a single `content_search("pricing")` call.

---

## Success Criteria

| Check | Pass condition |
|-------|---------------|
| `npm run evals` | 13/13 PASS |
| `npm test` | ≥ 1714 passing, no new failures |
| `npm run build` | No TypeScript errors |
| Manual prompt check | Send "how much does it cost?" to agent → agent calls `content_search`, returns correct range |

---

## Risk

**Low.** No DB changes, no new files, no new dependencies. Surgical 2-line edit to the system prompt + content file verification. Rollback is reverting the system prompt change.
