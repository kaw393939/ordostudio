/**
 * Policy Eval Runner
 *
 * Executes PolicyEvalScenario objects — no LLM required.
 * Supports three action types:
 *   - db-call   : call a function directly with the test DB
 *   - tool-call : call executeMaestroTool with optional callerContext
 *   - http      : fetch against POLICY_BASE_URL (skipped if server unavailable)
 *
 * Assertions are evaluated synchronously after the action completes.
 */

import Database from "better-sqlite3";
import type {
  PolicyEvalScenario,
  PolicyAssertion,
  PolicyAction,
} from "../types";
import { executeMaestroTool } from "@/lib/api/maestro-tools";

// ---------------------------------------------------------------------------
// Result types
// ---------------------------------------------------------------------------

export interface PolicyCheckResult {
  assertion: PolicyAssertion;
  passed: boolean;
  actual?: unknown;
  note?: string;
}

export interface PolicyScenarioResult {
  scenario: PolicyEvalScenario;
  passed: boolean;
  skipped: boolean;
  skipReason?: string;
  checkResults: PolicyCheckResult[];
  thrownError?: unknown;
  durationMs: number;
}

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

const POLICY_BASE_URL =
  process.env["POLICY_BASE_URL"] ?? "http://localhost:3000";

export async function runPolicyScenario(
  scenario: PolicyEvalScenario,
  db: Database.Database,
): Promise<PolicyScenarioResult> {
  const start = Date.now();
  const checkResults: PolicyCheckResult[] = [];
  let thrownError: unknown = undefined;
  let actionResult: unknown = undefined;
  let httpResponse: Response | null = null;
  let skipped = false;
  let skipReason: string | undefined;

  // Pre-setup
  if (scenario.preSetup) {
    try {
      scenario.preSetup(db);
    } catch (e) {
      return {
        scenario,
        passed: false,
        skipped: false,
        checkResults: [],
        thrownError: e,
        durationMs: Date.now() - start,
      };
    }
  }

  // Execute action
  const action: PolicyAction = scenario.action;

  try {
    if (action.type === "db-call") {
      actionResult = action.fn(db);
    } else if (action.type === "tool-call") {
      actionResult = executeMaestroTool(
        action.toolName,
        action.args,
        db,
        { callerId: action.callerId, callerRole: action.callerRole },
      );
    } else if (action.type === "http") {
      // Attempt HTTP call — skip gracefully if server is not running
      try {
        const fetchUrl = action.url.startsWith("http")
          ? action.url
          : `${POLICY_BASE_URL}${action.url}`;
        httpResponse = await fetch(fetchUrl, {
          method: action.method,
          headers: {
            "Content-Type": "application/json",
            ...(action.headers ?? {}),
          },
          body: action.body != null ? JSON.stringify(action.body) : undefined,
        });
        actionResult = {
          status: httpResponse.status,
          body: await httpResponse.json().catch(() => null),
        };
      } catch (fetchErr) {
        const msg =
          fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
        if (
          msg.includes("ECONNREFUSED") ||
          msg.includes("fetch failed") ||
          msg.includes("Failed to fetch")
        ) {
          skipped = true;
          skipReason = `HTTP action skipped — server not reachable at ${POLICY_BASE_URL}`;
        } else {
          thrownError = fetchErr;
        }
      }
    }
  } catch (err) {
    thrownError = err;
  }

  // Teardown (always runs)
  try {
    scenario.teardown?.(db);
  } catch {
    /* ignore teardown errors */
  }

  // Evaluate assertions
  if (!skipped) {
    for (const assertion of scenario.assertions) {
      const result = evaluateAssertion(
        assertion,
        actionResult,
        thrownError,
        httpResponse,
        db,
      );
      checkResults.push(result);
    }
  }

  const passed =
    !skipped && checkResults.length > 0 && checkResults.every((r) => r.passed);

  return {
    scenario,
    passed,
    skipped,
    skipReason,
    checkResults,
    thrownError,
    durationMs: Date.now() - start,
  };
}

// ---------------------------------------------------------------------------
// Assertion evaluator
// ---------------------------------------------------------------------------

function evaluateAssertion(
  assertion: PolicyAssertion,
  actionResult: unknown,
  thrownError: unknown,
  _httpResponse: Response | null,
  db: Database.Database,
): PolicyCheckResult {
  switch (assertion.type) {
    case "throws-with-code": {
      if (thrownError !== undefined) {
        const msg =
          thrownError instanceof Error
            ? thrownError.message
            : String(thrownError);
        const passed = msg.includes(assertion.code);
        return {
          assertion,
          passed,
          actual: msg,
          note: passed
            ? undefined
            : `Expected error containing "${assertion.code}" but got: ${msg}`,
        };
      }
      // Check if result is an error object (for tool-call returns)
      if (
        actionResult &&
        typeof actionResult === "object" &&
        "error" in (actionResult as object)
      ) {
        const errVal = (actionResult as Record<string, unknown>)["error"];
        const passed = String(errVal).includes(assertion.code);
        return {
          assertion,
          passed,
          actual: errVal,
          note: passed
            ? undefined
            : `Expected error containing "${assertion.code}" but got: ${String(errVal)}`,
        };
      }
      return {
        assertion,
        passed: false,
        actual: actionResult,
        note: `Expected a thrown error or error result with code "${assertion.code}" but action succeeded`,
      };
    }

    case "http-status": {
      const result = actionResult as { status?: number } | undefined;
      const actual = result?.status;
      const passed = actual === assertion.expected;
      return {
        assertion,
        passed,
        actual,
        note: passed
          ? undefined
          : `Expected HTTP status ${assertion.expected} but got ${actual}`,
      };
    }

    case "response-contains": {
      const result = actionResult as
        | { body?: Record<string, unknown>; [k: string]: unknown }
        | undefined;
      const body = result?.body ?? result;
      const actual =
        body && typeof body === "object"
          ? (body as Record<string, unknown>)[assertion.key]
          : undefined;
      const passed = actual === assertion.value;
      return {
        assertion,
        passed,
        actual,
        note: passed
          ? undefined
          : `Expected response.${assertion.key} === ${JSON.stringify(assertion.value)} but got ${JSON.stringify(actual)}`,
      };
    }

    case "db-row-exists": {
      try {
        const row = db
          .prepare(assertion.sql)
          .get(...(assertion.params ?? []));
        const passed = row !== undefined && row !== null;
        return {
          assertion,
          passed,
          actual: row,
          note: passed ? undefined : `No row matched: ${assertion.sql}`,
        };
      } catch (e) {
        return {
          assertion,
          passed: false,
          actual: e,
          note: `SQL error: ${e instanceof Error ? e.message : String(e)}`,
        };
      }
    }

    case "db-row-not-exists": {
      try {
        const row = db
          .prepare(assertion.sql)
          .get(...(assertion.params ?? []));
        const passed = row === undefined || row === null;
        return {
          assertion,
          passed,
          actual: row,
          note: passed ? undefined : `Unexpected row found: ${JSON.stringify(row)}`,
        };
      } catch (e) {
        return {
          assertion,
          passed: false,
          actual: e,
          note: `SQL error: ${e instanceof Error ? e.message : String(e)}`,
        };
      }
    }

    case "result-field": {
      const passed = assertion.matcher(actionResult);
      return {
        assertion,
        passed,
        actual: actionResult,
        note: passed ? undefined : `Result field matcher returned false`,
      };
    }

    default: {
      return {
        assertion: assertion as PolicyAssertion,
        passed: false,
        note: `Unknown assertion type: ${(assertion as { type: string }).type}`,
      };
    }
  }
}

// ---------------------------------------------------------------------------
// Run a full suite
// ---------------------------------------------------------------------------

export async function runPolicySuite(
  scenarios: PolicyEvalScenario[],
  makeDb: () => Database.Database,
): Promise<PolicyScenarioResult[]> {
  const results: PolicyScenarioResult[] = [];
  for (const scenario of scenarios) {
    const db = makeDb();
    const result = await runPolicyScenario(scenario, db);
    results.push(result);
    db.close();
  }
  return results;
}
