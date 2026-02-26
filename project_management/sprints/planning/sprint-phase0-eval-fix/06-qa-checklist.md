# Phase 0: Eval Hotfix — QA Checklist

**Sprint:** `sprint-phase0-eval-fix`

---

## Gate: All items must be checked before this sprint is marked DONE

### Code

- [ ] `grep -i "3,000\|18,000\|individual pricing" src/lib/api/agent-system-prompt.ts` → no results
- [ ] System prompt rule 6 contains the phrase "content_search" and "do not quote from memory"
- [ ] Pricing facts appear in `content/site/training.md` OR `content/site/services.md`

### Tests

- [ ] `npx vitest run` → ≥ 1714 passing
- [ ] `npm run evals` → **13/13 PASS**
- [ ] `intake-agent-pricing-lookup` specifically shows PASS in eval output

### Build

- [ ] `npm run build` → no errors, no TypeScript issues

### Commit

- [ ] Changes committed with message referencing `fix(eval):`
- [ ] Pushed to `origin main`

---

## Done Definition

Sprint is DONE when all boxes above are checked AND the commit is on `origin main`.  
Move this folder to `completed/sprint-phase0-eval-fix/` on completion.
