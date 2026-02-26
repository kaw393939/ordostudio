/**
 * Eval runner
 *
 * Executes a single EvalScenario and returns a scored EvalResult.
 *
 * - "intake-agent" scenarios: drives multi-turn conversations using the real
 *   Anthropic API (`runClaudeAgentLoop`), executes agent tools against the
 *   eval DB, then runs DB assertions.
 * - "triage" scenarios: calls `triageRequest()` once with real Anthropic API
 *   and checks the output fields.
 * - "workflow" scenarios: writes a feed event into the eval DB and runs DB
 *   assertions on workflow_executions + side-effects.
 */

import Database from "better-sqlite3";
import { setupEvalDb, teardownEvalDb } from "./db";
import type {
  EvalScenario,
  EvalResult,
  EvalReport,
  TurnResult,
  CheckResult,
  ResponseCheck,
  DbAssertion,
  TriageCheck,
} from "./types";
import { runClaudeAgentLoop, DEFAULT_CLAUDE_MODEL } from "../lib/llm-anthropic";
import { triageRequest } from "../lib/llm-triage";
import { writeFeedEvent } from "../lib/api/feed-events";
import { executeAgentTool, AGENT_TOOL_DEFINITIONS } from "../lib/api/agent-tools";
import { AGENT_SYSTEM_PROMPT } from "../lib/api/agent-system-prompt";
import { MAESTRO_SYSTEM_PROMPT } from "../lib/api/maestro-system-prompt";
import { MAESTRO_TOOLS, executeMaestroTool } from "../lib/api/maestro-tools";

// ---------------------------------------------------------------------------
// Helpers — response checks
// ---------------------------------------------------------------------------

function evalResponseCheck(
  check: ResponseCheck,
  assistantText: string,
  toolsCalledNames: string[],
): CheckResult {
  const lower = assistantText.toLowerCase();

  switch (check.type) {
    case "contains": {
      const passed = lower.includes(check.value.toLowerCase());
      return { check, passed, actual: assistantText, note: passed ? undefined : `"${check.value}" not found in response` };
    }
    case "not_contains": {
      const passed = !lower.includes(check.value.toLowerCase());
      return { check, passed, actual: assistantText, note: passed ? undefined : `"${check.value}" unexpectedly found in response` };
    }
    case "tool_called": {
      const passed = toolsCalledNames.includes(check.name);
      return { check, passed, actual: toolsCalledNames, note: passed ? undefined : `expected tool "${check.name}" to be called` };
    }
    case "tool_not_called": {
      const passed = !toolsCalledNames.includes(check.name);
      return { check, passed, actual: toolsCalledNames, note: passed ? undefined : `tool "${check.name}" was called unexpectedly` };
    }
    case "regex": {
      const re = new RegExp(check.pattern, check.flags ?? "i");
      const passed = re.test(assistantText);
      return { check, passed, actual: assistantText, note: passed ? undefined : `pattern /${check.pattern}/ not matched` };
    }
  }
}

// ---------------------------------------------------------------------------
// Helpers — DB assertions
// ---------------------------------------------------------------------------

function evalDbAssertion(assertion: DbAssertion, db: Database.Database): CheckResult {
  try {
    const row = db.prepare(assertion.query).get(...(assertion.params ?? [])) as
      | Record<string, unknown>
      | undefined;
    const actual = row?.result ?? row;

    const passed =
      JSON.stringify(actual) === JSON.stringify(assertion.expected);

    return {
      check: assertion,
      passed,
      actual,
      note: passed
        ? undefined
        : `expected ${JSON.stringify(assertion.expected)}, got ${JSON.stringify(actual)}`,
    };
  } catch (err) {
    return {
      check: assertion,
      passed: false,
      note: `query error: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

// ---------------------------------------------------------------------------
// Helpers — triage checks
// ---------------------------------------------------------------------------

function evalTriageCheck(
  check: TriageCheck,
  output: Record<string, unknown>,
): CheckResult {
  let actual: unknown;
  let passed: boolean;

  switch (check.field) {
    case "category":
    case "priority":
      actual = output[check.field];
      passed = actual === check.expected;
      break;
    case "confidence_gte":
      actual = output["confidence"];
      passed = typeof actual === "number" && actual >= (check.expected as number);
      break;
    case "confidence_lte":
      actual = output["confidence"];
      passed = typeof actual === "number" && actual <= (check.expected as number);
      break;
    default:
      actual = undefined;
      passed = false;
  }

  return {
    check,
    passed,
    actual,
    note: passed ? undefined : `expected ${JSON.stringify(check.expected)}, got ${JSON.stringify(actual)}`,
  };
}

// ---------------------------------------------------------------------------
// Per-scenario runner functions
// ---------------------------------------------------------------------------

async function runIntakeAgentScenario(
  scenario: Extract<EvalScenario, { type: "intake-agent" }>,
  apiKey: string,
): Promise<EvalResult> {
  const start = Date.now();
  const evalDb = await setupEvalDb();

  try {
    if (scenario.preSetup) {
      scenario.preSetup(evalDb.db, evalDb.userId, evalDb.adminId);
    }

    // Set DB path so agent tools resolve the eval DB
    process.env.APPCTL_DB_FILE = evalDb.dbPath;
    process.env.APPCTL_ENV = "local";

    const history: Array<{ role: "user" | "assistant"; text: string }> = [];
    const turnResults: TurnResult[] = [];

    for (let i = 0; i < scenario.turns.length; i++) {
      const turn = scenario.turns[i];

      const claudeResult = await runClaudeAgentLoop({
        apiKey,
        systemPrompt: AGENT_SYSTEM_PROMPT,
        history,
        userMessage: turn.userMessage,
        tools: AGENT_TOOL_DEFINITIONS,
        executeToolFn: async (name, args) => executeAgentTool(name, args),
      });

      const toolsCalledNames = claudeResult.toolEvents
        .filter((e) => e.type === "tool_call")
        .map((e) => e.name);

      const checkResults: CheckResult[] = (turn.responseChecks ?? []).map(
        (check) =>
          evalResponseCheck(check, claudeResult.assistantText, toolsCalledNames),
      );

      const turnPassed = checkResults.every((r) => r.passed);

      turnResults.push({
        turn: i + 1,
        userMessage: turn.userMessage,
        assistantText: claudeResult.assistantText,
        toolsCalledNames,
        checkResults,
        passed: turnPassed,
      });

      // Build history for next turn
      history.push({ role: "user", text: turn.userMessage });
      history.push({ role: "assistant", text: claudeResult.assistantText });
    }

    // Reload DB for assertions (agent tools may have used a different connection)
    const freshDb = new Database(evalDb.dbPath);

    const dbAssertionResults: CheckResult[] = (scenario.dbAssertions ?? []).map(
      (a) => evalDbAssertion(a, freshDb),
    );
    freshDb.close();

    const allChecksPassed =
      turnResults.every((t) => t.passed) &&
      dbAssertionResults.every((r) => r.passed);

    return {
      scenario,
      passed: allChecksPassed,
      turns: turnResults,
      dbAssertionResults,
      durationMs: Date.now() - start,
    };
  } catch (err) {
    return {
      scenario,
      passed: false,
      durationMs: Date.now() - start,
      error: err instanceof Error ? err.message : String(err),
    };
  } finally {
    await teardownEvalDb(evalDb);
  }
}

async function runTriageScenario(
  scenario: Extract<EvalScenario, { type: "triage" }>,
): Promise<EvalResult> {
  const start = Date.now();
  try {
    const result = await triageRequest({ text: scenario.input });
    const output = result as unknown as Record<string, unknown>;

    const checkResults: CheckResult[] = scenario.triageChecks.map((check) =>
      evalTriageCheck(check, output),
    );

    return {
      scenario,
      passed: checkResults.every((r) => r.passed),
      triageOutput: output,
      dbAssertionResults: checkResults,
      durationMs: Date.now() - start,
    };
  } catch (err) {
    return {
      scenario,
      passed: false,
      durationMs: Date.now() - start,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function runWorkflowScenario(
  scenario: Extract<EvalScenario, { type: "workflow" }>,
): Promise<EvalResult> {
  const start = Date.now();
  const evalDb = await setupEvalDb();

  try {
    if (scenario.preSetup) {
      scenario.preSetup(evalDb.db, evalDb.userId);
    }

    process.env.APPCTL_DB_FILE = evalDb.dbPath;
    process.env.APPCTL_ENV = "local";

    // Fire the workflow trigger by writing a feed event
    writeFeedEvent(evalDb.db, {
      userId: evalDb.userId,
      type: scenario.trigger.type as Parameters<typeof writeFeedEvent>[1]["type"],
      title: scenario.trigger.title,
      description: scenario.trigger.description ?? "",
    });

    // Reload fresh connection for assertions
    const freshDb = new Database(evalDb.dbPath);
    const dbAssertionResults: CheckResult[] = scenario.dbAssertions.map((a) =>
      evalDbAssertion(a, freshDb),
    );
    freshDb.close();

    return {
      scenario,
      passed: dbAssertionResults.every((r) => r.passed),
      dbAssertionResults,
      durationMs: Date.now() - start,
    };
  } catch (err) {
    return {
      scenario,
      passed: false,
      durationMs: Date.now() - start,
      error: err instanceof Error ? err.message : String(err),
    };
  } finally {
    await teardownEvalDb(evalDb);
  }
}

async function runContentRetrievalScenario(
  scenario: Extract<EvalScenario, { type: "content-retrieval" }>,
  apiKey: string,
): Promise<EvalResult> {
  const start = Date.now();
  const evalDb = await setupEvalDb();

  try {
    // Async preSetup — runs the content indexer
    if (scenario.preSetup) {
      await scenario.preSetup(evalDb.db);
    }

    process.env.APPCTL_DB_FILE = evalDb.dbPath;
    process.env.APPCTL_ENV = "local";

    const history: Array<{ role: "user" | "assistant"; text: string }> = [];
    const turnResults: TurnResult[] = [];
    const toolContext = { userRole: scenario.userRole ?? null };

    for (let i = 0; i < scenario.turns.length; i++) {
      const turn = scenario.turns[i];

      const claudeResult = await runClaudeAgentLoop({
        apiKey,
        systemPrompt: AGENT_SYSTEM_PROMPT,
        history,
        userMessage: turn.userMessage,
        tools: AGENT_TOOL_DEFINITIONS,
        executeToolFn: async (name, args) =>
          executeAgentTool(name, args, undefined, toolContext),
      });

      const toolsCalledNames = claudeResult.toolEvents
        .filter((e) => e.type === "tool_call")
        .map((e) => e.name);

      const checkResults: CheckResult[] = (turn.responseChecks ?? []).map(
        (check) => evalResponseCheck(check, claudeResult.assistantText, toolsCalledNames),
      );

      const turnPassed = checkResults.every((r) => r.passed);

      turnResults.push({
        turn: i + 1,
        userMessage: turn.userMessage,
        assistantText: claudeResult.assistantText,
        toolsCalledNames,
        checkResults,
        passed: turnPassed,
      });

      history.push({ role: "user", text: turn.userMessage });
      history.push({ role: "assistant", text: claudeResult.assistantText });
    }

    // Reload fresh connection for DB assertions
    const freshDb = new Database(evalDb.dbPath);
    const dbAssertionResults: CheckResult[] = (scenario.dbAssertions ?? []).map(
      (a) => evalDbAssertion(a, freshDb),
    );
    freshDb.close();

    const allChecksPassed =
      turnResults.every((t) => t.passed) &&
      dbAssertionResults.every((r) => r.passed);

    return {
      scenario,
      passed: allChecksPassed,
      turns: turnResults,
      dbAssertionResults,
      durationMs: Date.now() - start,
    };
  } catch (err) {
    return {
      scenario,
      passed: false,
      durationMs: Date.now() - start,
      error: err instanceof Error ? err.message : String(err),
    };
  } finally {
    await teardownEvalDb(evalDb);
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

async function runMaestroScenario(
  scenario: Extract<EvalScenario, { type: "maestro" }>,
  apiKey: string,
): Promise<EvalResult> {
  const start = Date.now();
  const evalDb = await setupEvalDb();

  try {
    if (scenario.preSetup) {
      scenario.preSetup(evalDb.db, evalDb.adminId);
    }

    process.env.APPCTL_DB_FILE = evalDb.dbPath;
    process.env.APPCTL_ENV = "local";

    const history: Array<{ role: "user" | "assistant"; text: string }> = [];
    const turnResults: TurnResult[] = [];

    for (let i = 0; i < scenario.turns.length; i++) {
      const turn = scenario.turns[i];

      const claudeResult = await runClaudeAgentLoop({
        apiKey,
        systemPrompt: MAESTRO_SYSTEM_PROMPT,
        history,
        userMessage: turn.userMessage,
        tools: MAESTRO_TOOLS,
        executeToolFn: async (name, args) =>
          executeMaestroTool(name, args, evalDb.db),
      });

      const toolsCalledNames = claudeResult.toolEvents
        .filter((e) => e.type === "tool_call")
        .map((e) => e.name);

      const checkResults: CheckResult[] = (turn.responseChecks ?? []).map(
        (check) =>
          evalResponseCheck(check, claudeResult.assistantText, toolsCalledNames),
      );

      const turnPassed = checkResults.every((r) => r.passed);

      turnResults.push({
        turn: i + 1,
        userMessage: turn.userMessage,
        assistantText: claudeResult.assistantText,
        toolsCalledNames,
        checkResults,
        passed: turnPassed,
      });

      history.push({ role: "user", text: turn.userMessage });
      history.push({ role: "assistant", text: claudeResult.assistantText });
    }

    // Reload DB for assertions (maestro tools wrote via evalDb.db connection)
    const freshDb = new Database(evalDb.dbPath);
    const dbAssertionResults: CheckResult[] = (scenario.dbAssertions ?? []).map(
      (a) => evalDbAssertion(a, freshDb),
    );
    freshDb.close();

    const allChecksPassed =
      turnResults.every((t) => t.passed) &&
      dbAssertionResults.every((r) => r.passed);

    return {
      scenario,
      passed: allChecksPassed,
      turns: turnResults,
      dbAssertionResults,
      durationMs: Date.now() - start,
    };
  } catch (err) {
    return {
      scenario,
      passed: false,
      durationMs: Date.now() - start,
      error: err instanceof Error ? err.message : String(err),
    };
  } finally {
    await teardownEvalDb(evalDb);
  }
}

// ---------------------------------------------------------------------------
// Public API — run a single scenario
// ---------------------------------------------------------------------------

/**
 * Run a single scenario and return its result.
 * Requires ANTHROPIC_API_KEY to be set for "intake-agent" and "triage" kinds.
 */
export async function runScenario(scenario: EvalScenario): Promise<EvalResult> {
  const apiKey =
    process.env.ANTHROPIC_API_KEY ?? process.env.API__ANTHROPIC_API_KEY ?? "";

  switch (scenario.type) {
    case "intake-agent":
      return runIntakeAgentScenario(scenario, apiKey);
    case "triage":
      return runTriageScenario(scenario);
    case "workflow":
      return runWorkflowScenario(scenario);
    case "content-retrieval":
      return runContentRetrievalScenario(scenario, apiKey);
    case "maestro":
      return runMaestroScenario(scenario, apiKey);
  }
}

/**
 * Run all scenarios sequentially and return the full report.
 */
export async function runAllScenarios(
  scenarios: EvalScenario[],
): Promise<EvalReport> {
  const model =
    process.env.ANTHROPIC_MODEL ?? DEFAULT_CLAUDE_MODEL;

  const results: EvalResult[] = [];
  for (const scenario of scenarios) {
    console.log(`  ▶ ${scenario.id}: ${scenario.name}`);
    const result = await runScenario(scenario);
    const status = result.passed ? "✓ PASS" : "✗ FAIL";
    console.log(`    ${status}  (${result.durationMs}ms)${result.error ? "  error: " + result.error : ""}`);
    results.push(result);
  }

  const passed = results.filter((r) => r.passed).length;
  return {
    runAt: new Date().toISOString(),
    model,
    total: results.length,
    passed,
    failed: results.length - passed,
    results,
  };
}
