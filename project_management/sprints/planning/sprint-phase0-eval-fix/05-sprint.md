# Phase 0: Eval Hotfix — Sprint Tasks

**Sprint:** `sprint-phase0-eval-fix`  
**Estimate:** 2–4 hours

---

## Task Breakdown

### T1 — Read the current system prompt
**File:** `src/lib/api/agent-system-prompt.ts`  
Read the full file. Locate the pricing sentence and the current rule 6 (or equivalent rule about fact-checking). Note the exact text to replace.

**Acceptance:** You know exactly which line(s) to change.

---

### T2 — Read the content files
**Files:** `content/site/training.md`, `content/site/services.md`  

Check that pricing appears in at least one of these files in a format `content_search` will return. The search is keyword-based (token frequency scoring) — the word "pricing" or "cost" plus the dollar figures must appear in the same chunk (~300 words).

**Acceptance:** Running `npx tsx -e "const {searchContent} = require('./src/lib/api/content-search'); console.log(searchContent('pricing'))"` returns a result containing `3,000`.

---

### T3 — Patch content files (if needed)
If T2 shows the pricing is missing or unclear, add it now. Use the markdown format from `02-architecture.md`. Keep it factual and prose-natural — the agent will quote from it.

**Acceptance:** `searchContent('how much does it cost')` returns a chunk mentioning prices.

---

### T4 — Edit system prompt
**File:** `src/lib/api/agent-system-prompt.ts`

1. Remove the sentence containing `$3,000 to $5,000` and `$18,000 to $24,000`
2. Find the rules array. Replace or add rule 6: 
   > "Before stating any specific fact about pricing, training syllabi, schedule, guild structure, or program requirements — you MUST call content_search. Never quote figures from memory."

**Acceptance:** `grep -i "3,000\|18,000\|individual pricing" src/lib/api/agent-system-prompt.ts` returns nothing.

---

### T5 — Run eval suite
```bash
npm run evals
```
**Acceptance:** 13/13 PASS. If `intake-agent-pricing-lookup` still fails, check that Claude is actually calling `content_search` and that the content chunk is being returned.

---

### T6 — Run unit tests
```bash
npx vitest run
```
**Acceptance:** ≥ 1714 passing, no new failures.

---

### T7 — Build check
```bash
npm run build
```
**Acceptance:** Clean, no TypeScript errors.

---

### T8 — Commit
```bash
git add src/lib/api/agent-system-prompt.ts content/site/
git commit -m "fix(eval): remove pricing from system prompt; require content_search for factual claims"
git push origin main
```

**Acceptance:** Remote updated. Eval gate is green.
