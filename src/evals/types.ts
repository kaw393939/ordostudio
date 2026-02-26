/**
 * Eval framework shared types
 *
 * Three scenario kinds:
 *  - "intake-agent" — multi-turn conversation with Claude as the AI,
 *    real Anthropic API calls, DB assertions verify state.
 *  - "triage"      — call triageRequest() with real Anthropic API,
 *    assert on category / confidence / priority outputs.
 *  - "workflow"    — fire writeFeedEvent into a live DB, assert on
 *    workflow_executions rows and side-effects.
 */

import type Database from "better-sqlite3";

// ---------------------------------------------------------------------------
// Response checks (applied after each agent turn)
// ---------------------------------------------------------------------------

export type ResponseCheck =
  | { type: "contains"; value: string; description?: string }
  | { type: "not_contains"; value: string; description?: string }
  | { type: "tool_called"; name: string; description?: string }
  | { type: "tool_not_called"; name: string; description?: string }
  | { type: "regex"; pattern: string; flags?: string; description?: string };

// ---------------------------------------------------------------------------
// DB assertions (applied after the full scenario)
// ---------------------------------------------------------------------------

export interface DbAssertion {
  description: string;
  /** SQL query — must return exactly one row with one column named "result" */
  query: string;
  /** Parameters for the SQL query (optional) */
  params?: unknown[];
  /** Expected value of `result` (uses deep-equal) */
  expected: unknown;
}

// ---------------------------------------------------------------------------
// Triage checks
// ---------------------------------------------------------------------------

export interface TriageCheck {
  field: "category" | "priority" | "confidence_gte" | "confidence_lte";
  expected: unknown;
  description?: string;
}

// ---------------------------------------------------------------------------
// Scenario definitions
// ---------------------------------------------------------------------------

export interface AgentTurn {
  userMessage: string;
  /** Human-readable description of what a correct response looks like */
  expectedBehavior: string;
  responseChecks?: ResponseCheck[];
}

export type EvalScenario =
  | {
      id: string;
      name: string;
      type: "intake-agent";
      description: string;
      turns: AgentTurn[];
      /** Run before the scenario (insert data, etc.) */
      preSetup?: (db: Database.Database, userId: string, adminId: string) => void;
      dbAssertions?: DbAssertion[];
    }
  | {
      id: string;
      name: string;
      type: "triage";
      description: string;
      input: string;
      triageChecks: TriageCheck[];
    }
  | {
      id: string;
      name: string;
      type: "workflow";
      description: string;
      /** Run custom DB setup before firing the trigger event */
      preSetup?: (db: Database.Database, userId: string) => void;
      /** The feed event to write to trigger workflows */
      trigger: {
        type: string;
        title: string;
        description?: string;
      };
      dbAssertions: DbAssertion[];
    };

// ---------------------------------------------------------------------------
// Result types
// ---------------------------------------------------------------------------

export interface CheckResult {
  check: ResponseCheck | TriageCheck | DbAssertion;
  passed: boolean;
  actual?: unknown;
  note?: string;
}

export interface TurnResult {
  turn: number;
  userMessage: string;
  assistantText: string;
  toolsCalledNames: string[];
  checkResults: CheckResult[];
  passed: boolean;
}

export interface EvalResult {
  scenario: EvalScenario;
  passed: boolean;
  /** Turn-by-turn results (intake-agent only) */
  turns?: TurnResult[];
  /** Triage output (triage only) */
  triageOutput?: Record<string, unknown>;
  /** DB assertion results */
  dbAssertionResults?: CheckResult[];
  /** Total wall-clock duration in ms */
  durationMs: number;
  error?: string;
}

export interface EvalReport {
  runAt: string;
  model: string;
  total: number;
  passed: number;
  failed: number;
  results: EvalResult[];
}
