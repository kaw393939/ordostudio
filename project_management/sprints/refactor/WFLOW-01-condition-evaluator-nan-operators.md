# WFLOW-01 — Workflow Condition Evaluator: NaN Arithmetic + Operator Exhaustiveness

**Area:** `src/lib/api/workflow-engine.ts`
**Severity:** Medium
**Category:** Correctness (silent NaN comparison, missing operators, non-exhaustive switch)

---

## Problem 1 — `"gt"` / `"lt"` produce silent NaN when field is missing

```ts
function resolveField(field, event): unknown {
  // returns null when field path doesn't exist
}

// eq/neq/contains use the string coercion: String(rawValue ?? "") → ""
const eventVal = String(rawValue ?? "");

// BUT gt/lt bypass the null-coalescing and use rawValue directly:
case "gt":
  return Number(rawValue) > Number(condition.value);   // Number(undefined) = NaN
case "lt":
  return Number(rawValue) < Number(condition.value);   // NaN < x = false
```

`Number(undefined) = NaN`.  `NaN > x` and `NaN < x` are both `false`.
A typo in the field name silently makes the rule always skip instead of
producing a logged error.  The operator and string-coercion paths are also
inconsistent (`rawValue` vs `eventVal`).

### Fix

Use `Number(eventVal)` (the coerced string) for both `gt` and `lt`, matching
the `eq/neq/contains` paths.  `Number("") = 0`, so a missing field evaluates
as 0, which is deterministic and consistent with the `eq` path.

---

## Problem 2 — Missing `"gte"` and `"lte"` operators

The `ConditionSpec` union only includes `"gt"` and `"lt"`.  Workflow authors
who store a rule with `operator: "gte"` (a natural expectation) hit the
`default: return false` branch silently — the rule fires as if the condition
was not met, with no log.

### Fix

Add `"gte"` and `"lte"` to the `ConditionSpec` operator union and the
`evaluateCondition` switch.

---

## Problem 3 — Non-exhaustive switch hides future operator gaps

The `default: return false` branch swallows unknown operators with no
diagnostic.  TypeScript cannot detect the exhaustion gap at compile time
because the `condition` comes in as a parsed JSON object (not a branded
discriminated union).

### Fix

Replace `default: return false` with a logged warning + `return false`:

```ts
default: {
  getLogger().warn({ operator: condition.operator }, "workflow: unknown condition operator — skipping rule");
  return false;
}
```

---

## Deliverables

- [ ] `evaluateCondition`: change `"gt"/"lt"` to use `Number(eventVal)` not `Number(rawValue)`
- [ ] Add `"gte"` and `"lte"` to `ConditionSpec` union and `evaluateCondition` switch
- [ ] Replace silent `default: return false` with warned return
- [ ] Unit test suite for `evaluateCondition`:
  - eq/neq/contains on present and missing fields
  - gt/lt/gte/lte on numeric strings, missing fields, NaN inputs
  - unknown operator produces `false` (warn path)
- [ ] All existing workflow tests pass

---

## Acceptance Criteria

1. `evaluateCondition({ field: "missing_field", operator: "gt", value: 5 }, event)`
   returns `false` deterministically (not NaN-based).
2. `evaluateCondition({ field: "attempts", operator: "gte", value: 3 }, event)`
   correctly evaluates instead of silently skipping.
3. An unknown operator (`"regex"`) returns `false` without throwing.
