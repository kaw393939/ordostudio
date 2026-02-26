#!/usr/bin/env node
/**
 * Policy Eval Harness
 *
 * Runs the six deterministic policy-enforcement scenarios without requiring
 * an Anthropic API key. HTTP scenarios that need a running dev server are
 * skipped automatically when the server is unavailable.
 *
 * Usage:
 *   npm run evals:policy              # run all PE scenarios
 *   npm run evals:policy -- --id PE-02-double-booking-prevented
 *
 * Exit codes:
 *   0 — all scenarios passed (or skipped)
 *   1 — one or more scenarios failed
 *   2 — configuration / setup error
 */

process.env.NODE_ENV = "development";

import { config as loadEnv } from "dotenv";
import { join } from "node:path";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";

const repoRoot = process.cwd();

const envLocalPath = join(repoRoot, ".env.local");
if (existsSync(envLocalPath)) {
  loadEnv({ path: envLocalPath });
}
loadEnv({ path: join(repoRoot, ".env"), override: false });

// ---------------------------------------------------------------------------
// Imports that depend on env vars
// ---------------------------------------------------------------------------

import { setupEvalDb, teardownAllEvalDbs } from "./db";
import { runPolicyScenario } from "./runners/policy-runner";
import type { PolicyScenarioResult } from "./runners/policy-runner";
import { policyScenarios } from "./policy-suite";

// ---------------------------------------------------------------------------
// CLI arg parsing
// ---------------------------------------------------------------------------

function parseArgs(): { id?: string; help: boolean } {
  const args = process.argv.slice(2);
  let id: string | undefined;
  let help = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--id" && args[i + 1]) {
      id = args[++i];
    } else if (args[i] === "--help" || args[i] === "-h") {
      help = true;
    }
  }
  return { id, help };
}

// ---------------------------------------------------------------------------
// Pretty-print
// ---------------------------------------------------------------------------

const DIVIDER = "─".repeat(72);

function printResults(results: PolicyScenarioResult[]): void {
  console.log("\n" + DIVIDER);
  console.log(`Policy Eval Results  —  ${new Date().toISOString()}`);
  console.log(DIVIDER);

  for (const r of results) {
    if (r.skipped) {
      console.log(
        `\n  ⊘ [SKIP] ${r.scenario.id}  (${r.durationMs}ms)`,
      );
      console.log(`     ${r.skipReason ?? "skipped"}`);
      continue;
    }

    const icon = r.passed ? "✓" : "✗";
    const label = r.passed ? "PASS" : "FAIL";
    console.log(
      `\n  ${icon} [${label}] ${r.scenario.id}  (${r.durationMs}ms)`,
    );
    console.log(`     ${r.scenario.name}`);

    if (r.thrownError) {
      const msg =
        r.thrownError instanceof Error
          ? r.thrownError.message
          : String(r.thrownError);
      console.log(`     THREW: ${msg}`);
    }

    for (const check of r.checkResults) {
      const prefix = check.passed ? "  ✓" : "  ✗";
      const desc =
        (check.assertion as { description?: string }).description ??
        check.assertion.type;
      console.log(`     ${prefix} ${desc}`);
      if (!check.passed && check.note) {
        console.log(`       → ${check.note}`);
      }
    }
  }

  const total   = results.length;
  const skipped = results.filter((r) => r.skipped).length;
  const ran     = total - skipped;
  const passed  = results.filter((r) => r.passed).length;
  const failed  = results.filter((r) => !r.passed && !r.skipped).length;

  console.log("\n" + DIVIDER);
  console.log(
    `Total: ${total}  |  ` +
      `Ran: ${ran}  |  ` +
      `Skipped: ${skipped}  |  ` +
      `Passed: \x1b[32m${passed}\x1b[0m  |  ` +
      `Failed: \x1b[${failed > 0 ? "31" : "32"}m${failed}\x1b[0m`,
  );
  console.log(DIVIDER + "\n");
}

// ---------------------------------------------------------------------------
// Write report
// ---------------------------------------------------------------------------

async function writeReport(
  results: PolicyScenarioResult[],
): Promise<string> {
  const outputDir = join(repoRoot, "eval-results");
  await mkdir(outputDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename  = `policy-${timestamp}.json`;
  const filePath  = join(outputDir, filename);
  const latestPath = join(outputDir, "latest-policy.json");

  // Strip non-serialisable fields (fn references in db-call actions)
  const serializable = results.map((r) => ({
    id:           r.scenario.id,
    name:         r.scenario.name,
    passed:       r.passed,
    skipped:      r.skipped,
    skipReason:   r.skipReason,
    durationMs:   r.durationMs,
    checkResults: r.checkResults.map((c) => ({
      type:    c.assertion.type,
      passed:  c.passed,
      actual:  c.actual,
      note:    c.note,
    })),
    thrownError:
      r.thrownError instanceof Error ? r.thrownError.message : r.thrownError,
  }));

  const json = JSON.stringify({ runAt: new Date().toISOString(), results: serializable }, null, 2);
  await writeFile(filePath, json, "utf-8");
  await writeFile(latestPath, json, "utf-8");
  return filePath;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const { id, help } = parseArgs();

  if (help) {
    console.log(`
Studio Ordo — Policy Eval Harness
===================================
Usage: npm run evals:policy [-- [options]]

Options:
  --id <id>   Run only the scenario with this ID
  --help      Show this message

No ANTHROPIC_API_KEY required.
HTTP scenarios are skipped when the dev server is not running.
Set POLICY_BASE_URL to override the default http://localhost:3000.
    `);
    process.exit(0);
  }

  let scenarios = [...policyScenarios];

  if (id) {
    scenarios = scenarios.filter((s) => s.id === id);
    if (scenarios.length === 0) {
      console.error(`No policy scenario found with id "${id}"`);
      process.exit(2);
    }
  }

  console.log(
    `\nRunning ${scenarios.length} policy scenario(s)...\n`,
  );

  const results: PolicyScenarioResult[] = [];

  for (const scenario of scenarios) {
    // Fresh migrated DB per scenario (no cross-contamination)
    const evalDb = await setupEvalDb();
    try {
      const result = await runPolicyScenario(scenario, evalDb.db);
      results.push(result);

      const statusStr = result.skipped
        ? "\x1b[33mSKIP\x1b[0m"
        : result.passed
          ? "\x1b[32mPASS\x1b[0m"
          : "\x1b[31mFAIL\x1b[0m";
      console.log(`  [${statusStr}] ${scenario.id}`);
    } finally {
      evalDb.db.close();
    }
  }

  const reportPath = await writeReport(results);
  printResults(results);
  console.log(`Report written to: ${reportPath}\n`);

  const failed = results.filter((r) => !r.passed && !r.skipped).length;
  if (failed > 0) {
    console.log(
      `\x1b[33m⚠  ${failed} policy scenario(s) failed.\x1b[0m\n`,
    );
    process.exit(1);
  } else {
    const skipped = results.filter((r) => r.skipped).length;
    const msg =
      skipped > 0
        ? `\x1b[32m✓ All policy scenarios passed\x1b[0m (${skipped} skipped — start dev server to run HTTP scenarios)`
        : "\x1b[32m✓ All policy scenarios passed.\x1b[0m";
    console.log(msg + "\n");
    process.exit(0);
  }
}

main()
  .catch((err) => {
    console.error("\nPolicy eval harness crashed:", err);
    process.exit(2);
  })
  .finally(() => teardownAllEvalDbs());
