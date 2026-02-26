# Phase 0: Eval Hotfix — Eval Specs

**Sprint:** `sprint-phase0-eval-fix`

---

## Existing Eval to Fix: `intake-agent-pricing-lookup`

**File:** `src/evals/scenarios/intake-agent.ts`  
**Current status:** FAIL  
**Target status after this sprint:** PASS

### Scenario Definition (what it should look like)

```typescript
{
  id: 'intake-agent-pricing-lookup',
  type: 'intake-agent',
  description: 'Agent retrieves pricing via content_search — never from memory',
  turns: [
    {
      role: 'user',
      content: 'How much does the training program cost?',
    },
  ],
  assertions: [
    {
      type: 'tool_called',
      tool: 'content_search',
      description: 'Must call content_search before answering pricing question',
    },
    {
      type: 'response_includes',
      value: '3,000',
      description: 'Response must include the individual pricing figure',
    },
    {
      type: 'response_not_includes',
      value: 'I don\'t have',
      description: 'Agent must not claim ignorance if pricing is in content',
    },
  ],
}
```

### Verify the current assertion structure in the file

Before editing, run:
```bash
grep -A 20 "pricing-lookup" src/evals/scenarios/intake-agent.ts
```

The assertions may already be correct. If so, the only fix is the system prompt change. If the assertions are missing, add them per the template above.

---

## Regression Check: All 12 Passing Evals

After the system prompt change, run the full suite and confirm no regression:

```bash
npm run evals
```

Expected: **13/13 PASS**

Key scenarios to watch for regression:
- `intake-agent-submit-intake` — agent submits intake; should not call `content_search` unnecessarily
- `intake-agent-booking-flow` — booking creation; should not be affected
- `triage-*` — no system prompt dependency; should be clean
- `workflow-*` — no system prompt dependency; should be clean

---

## No New Evals in This Sprint

This sprint has zero new eval scenarios. The only deliverable is making the one existing failing eval pass without breaking the 12 that pass.
