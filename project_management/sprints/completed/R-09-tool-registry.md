# Sprint R-09: Tool Registry with Compile-Time Safety + Zod Validation

**Track:** Chat Refactor  
**Audit source:** Uncle Bob / Knuth audit — parallel structure without compile-time link, unvalidated args  
**Depends on:** R-07 (route decomposed — cleaner surface to plug registry into)  
**Estimated effort:** 3–4 hours  

---

## Context

`src/lib/api/agent-tools.ts` currently has two parallel structures:

```typescript
// Part 1: Tool definitions (for Anthropic API)
export const AGENT_TOOL_DEFINITIONS: Anthropic.Tool[] = [
  {
    name: "check_availability",
    description: "...",
    input_schema: { type: "object", properties: { ... } },
  },
  {
    name: "get_program_details",
    ...
  },
  // ... 5 tools total
];

// Part 2: Tool executor (switch on name)
export async function executeAgentTool(
  name: string,
  args: Record<string, unknown>,
  db: Database,
  sessionId: string,
): Promise<{ content: string; bookingId?: string }> {
  switch (name) {
    case "check_availability":
      return checkAvailability(String(args.programId ?? ""), db);
    case "get_program_details":
      return getProgramDetails(String(args.programId ?? ""), db);
    // ...
    default:
      return { content: `Unknown tool: ${name}` };
  }
}
```

### Problems

1. **No compile-time link** — adding a tool definition without adding a case to the switch (or vice versa) is a TypeScript-invisible bug. The switch's `default` case silently fails at runtime.

2. **Unvalidated args** — `String(args.x ?? "")` coercion means Claude can hallucinate wrong types (e.g., pass `programId: 123` instead of `"abc123"`) and the code will silently use the stringified number, writing garbage to the DB. Zod validation catches this loudly.

3. **`AGENT_TOOL_DEFINITIONS` format drives type** — the tool names appear as raw strings in the definitions array. There is no `ToolName` type, so `executeAgentTool(name: string, ...)` accepts any string.

---

## 9.1 — Tool Registry Architecture

```typescript
import { z, ZodSchema } from "zod";

// 1. Union literal type — all valid tool names
type ToolName =
  | "check_availability"
  | "get_program_details"
  | "book_consultation"
  | "get_contact_info"
  | "log_interest";

// 2. Each tool entry has: Anthropic definition, Zod schema, executor
interface ToolEntry<TArgs> {
  definition: Anthropic.Tool;
  schema: ZodSchema<TArgs>;
  execute: (args: TArgs, db: Database, sessionId: string) => Promise<ToolResult>;
}

interface ToolResult {
  content: string;
  bookingId?: string;
}

// 3. The registry — TypeScript enforces every ToolName has an entry
type ToolRegistry = {
  [K in ToolName]: ToolEntry<unknown>;
};
```

---

## 9.2 — Populating the Registry

```typescript
const TOOL_REGISTRY: ToolRegistry = {
  check_availability: {
    definition: {
      name: "check_availability",
      description: "Check available consultation slots for a given program",
      input_schema: {
        type: "object" as const,
        properties: {
          programId: { type: "string", description: "The program identifier" },
          weekOffset: { type: "number", description: "Weeks from now (0=this week)" },
        },
        required: ["programId"],
      },
    },
    schema: z.object({
      programId: z.string().min(1),
      weekOffset: z.number().int().min(0).max(52).default(0),
    }),
    execute: async ({ programId, weekOffset }, db) => {
      return checkAvailability(programId, weekOffset ?? 0, db);
    },
  },

  get_program_details: {
    definition: {
      name: "get_program_details",
      description: "Retrieve details about a specific program offering",
      input_schema: {
        type: "object" as const,
        properties: {
          programId: { type: "string" },
        },
        required: ["programId"],
      },
    },
    schema: z.object({
      programId: z.string().min(1),
    }),
    execute: async ({ programId }, db) => {
      return getProgramDetails(programId, db);
    },
  },

  // ... other 3 tools
};
```

---

## 9.3 — Derived Exports

```typescript
// AGENT_TOOL_DEFINITIONS derived from registry — never out of sync
export const AGENT_TOOL_DEFINITIONS: Anthropic.Tool[] = Object.values(TOOL_REGISTRY).map(
  (entry) => entry.definition,
);

// executeAgentTool validates args with Zod before calling executor
export async function executeAgentTool(
  name: string,
  args: unknown,
  db: Database,
  sessionId: string,
): Promise<ToolResult> {
  const entry = TOOL_REGISTRY[name as ToolName];

  if (!entry) {
    console.error(`[Tools] Unknown tool: ${name}`);
    return { content: `Error: unknown tool "${name}"` };
  }

  const parsed = entry.schema.safeParse(args);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    console.error(`[Tools] Invalid args for ${name}: ${msg}`);
    return { content: `Error: invalid arguments — ${msg}` };
  }

  return entry.execute(parsed.data, db, sessionId);
}
```

---

## 9.4 — What This Eliminates

| Before | After |
|--------|-------|
| `switch` with silent `default` | TypeScript error if ToolName added without entry |
| `String(args.x ?? "")` coercion | Zod `safeParse` with detailed error message |
| Definitions and executors can drift | Registry forces co-location |
| `args: Record<string, unknown>` | Each executor receives the typed Zod output |
| Silent garbage written to DB | Validation error returned to Claude before DB write |

---

## 9.5 — `resolveConfig` / `openCliDb` Consistency

While in this file, audit all tool executor functions for consistent DB access patterns. Issues found in audit:
- Some executors open their own `openCliDb()` call inside the function body
- Others receive `db` as a parameter

**Correct pattern:** all executors receive `db` as a parameter (passed from `executeAgentTool`). None should call `openCliDb()` directly. This ensures the single connection opened in `route.ts` is shared across all tool calls in a request and closed in the `finally` block (R-07).

---

## Tasks

| # | Action | File | Time |
|---|--------|------|------|
| T1 | Define `ToolName` union and `ToolEntry` / `ToolRegistry` types | `agent-tools.ts` | 20 min |
| T2 | Populate `TOOL_REGISTRY` with all 5 tools + Zod schemas | `agent-tools.ts` | 60 min |
| T3 | Derive `AGENT_TOOL_DEFINITIONS` from registry | `agent-tools.ts` | 10 min |
| T4 | Rewrite `executeAgentTool` with Zod validation | `agent-tools.ts` | 20 min |
| T5 | Audit and fix inconsistent `openCliDb()` calls in individual executors | `agent-tools.ts` | 20 min |
| T6 | Write unit tests: valid args, invalid args, unknown tool | `agent-tools.test.ts` | 45 min |
| T7 | TypeScript: `npx tsc --noEmit` to confirm registry enforces completeness | — | 5 min |

---

## Test Coverage

| Test | Scenario |
|------|----------|
| Valid args → executor runs | Happy path |
| Missing required field → Zod error, no DB call | Validation guard |
| Wrong type → Zod error, no DB call | Type guard |
| Unknown tool name → error content | Missing tool |
| All 5 tool names resolve without fallthrough | Coverage check |

---

## Definition of Done

- [ ] `ToolRegistry` type enforces that every `ToolName` has an entry at compile time
- [ ] `AGENT_TOOL_DEFINITIONS` derived from registry — zero manual sync required
- [ ] `executeAgentTool` validates all args with Zod before executing
- [ ] No `String(args.x ?? "")` coercion patterns remain
- [ ] No inline `openCliDb()` in individual executors
- [ ] `npx tsc --noEmit` clean
- [ ] 5+ new unit tests for the registry pass
- [ ] `npx vitest run` total ≥ 1573/1574
