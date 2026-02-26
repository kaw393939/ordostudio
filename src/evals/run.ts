#!/usr/bin/env node
/**
 * Eval harness entry point
 *
 * Usage:
 *   npm run evals                    # run all scenarios
 *   npm run evals -- --type triage   # run only triage scenarios
 *   npm run evals -- --id intake-agent-pricing-lookup  # run one scenario by ID
 *
 * Requires:
 *   ANTHROPIC_API_KEY in .env.local (for intake-agent + triage scenarios)
 *
 * Outputs:
 *   eval-results/<timestamp>.json   — full machine-readable report
 *   eval-results/latest.json        — symlinked/copied to latest run
 *
 * Exit codes:
 *   0 — all scenarios passed
 *   1 — one or more scenarios failed (human review required)
 *   2 — configuration error (missing API key, etc.)
 */

// Set NODE_ENV=development FIRST (before any imports) so route-level rate
// limiters are bypassed. Evals are integration tests, not production traffic.
process.env.NODE_ENV = "development";

// Load .env.local before anything else so the Anthropic key is available
import { config as loadEnv } from "dotenv";
import { join } from "node:path";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";

// npm run evals is always invoked from the project root
const repoRoot = process.cwd();

// Load .env.local from project root
const envLocalPath = join(repoRoot, ".env.local");
if (existsSync(envLocalPath)) {
  loadEnv({ path: envLocalPath });
}
// Also load .env (fallback)
loadEnv({ path: join(repoRoot, ".env"), override: false });

// ---------------------------------------------------------------------------
// Now import everything that depends on env vars
// ---------------------------------------------------------------------------

import { runAllScenarios } from "./runner";
import { teardownAllEvalDbs } from "./db";
import { intakeAgentScenarios } from "./scenarios/intake-agent";
import { triageScenarios } from "./scenarios/triage";
import { workflowScenarios } from "./scenarios/workflow";
import { contentRetrievalScenarios } from "./scenarios/content-retrieval";
import { maestroScenarios } from "./scenarios/maestro";
import { journeyFScenarios } from "./scenarios/journey-f";
import { commerceScenarios } from "./scenarios/commerce";
import { prospectScenarios } from "./scenarios/prospect";
import { eventScenarios } from "./scenarios/events";
import { membershipScenarios } from "./scenarios/membership";
import { affiliateScenarios } from "./scenarios/affiliate";
import { intelScenarios } from "./scenarios/intel";
import type { EvalScenario, EvalReport } from "./types";

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------

function parseArgs(): { type?: string; id?: string; help: boolean } {
  const args = process.argv.slice(2);
  let type: string | undefined;
  let id: string | undefined;
  let help = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--type" && args[i + 1]) {
      type = args[++i];
    } else if (args[i] === "--id" && args[i + 1]) {
      id = args[++i];
    } else if (args[i] === "--help" || args[i] === "-h") {
      help = true;
    }
  }

  return { type, id, help };
}

// ---------------------------------------------------------------------------
// Report output
// ---------------------------------------------------------------------------

async function writeReport(report: EvalReport): Promise<string> {
  const outputDir = join(repoRoot, "eval-results");
  await mkdir(outputDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `${timestamp}.json`;
  const filePath = join(outputDir, filename);
  const latestPath = join(outputDir, "latest.json");

  const json = JSON.stringify(report, null, 2);
  await writeFile(filePath, json, "utf-8");
  await writeFile(latestPath, json, "utf-8");

  return filePath;
}

// ---------------------------------------------------------------------------
// Pretty-print report summary
// ---------------------------------------------------------------------------

function printSummary(report: EvalReport): void {
  const divider = "─".repeat(72);
  console.log("\n" + divider);
  console.log(`Eval Results  —  ${report.runAt}`);
  console.log(`Model: ${report.model}`);
  console.log(divider);

  for (const result of report.results) {
    const icon = result.passed ? "✓" : "✗";
    const label = result.passed ? "PASS" : "FAIL";
    const duration = `${result.durationMs}ms`;
    console.log(`\n  ${icon} [${label}] ${result.scenario.id}  (${duration})`);
    console.log(`     ${result.scenario.name}`);

    if (result.error) {
      console.log(`     ERROR: ${result.error}`);
    }

    // Print failed turn checks
    if (result.turns) {
      for (const turn of result.turns) {
        if (!turn.passed) {
          console.log(`     Turn ${turn.turn}: FAILED`);
          for (const check of turn.checkResults.filter((c) => !c.passed)) {
            console.log(`       ✗ ${check.note}`);
          }
        }
      }
    }

    // Print failed triage checks
    if (result.triageOutput && result.dbAssertionResults) {
      for (const check of result.dbAssertionResults.filter((c) => !c.passed)) {
        console.log(`     ✗ ${check.note}`);
      }
    }

    // Print failed DB assertions
    if (!result.triageOutput && result.dbAssertionResults) {
      for (const check of result.dbAssertionResults.filter((c) => !c.passed)) {
        console.log(`     ✗ ${(check.check as { description: string }).description}: ${check.note}`);
      }
    }
  }

  console.log("\n" + divider);
  console.log(
    `Total: ${report.total}  |  ` +
      `Passed: \x1b[32m${report.passed}\x1b[0m  |  ` +
      `Failed: \x1b[${report.failed > 0 ? "31" : "32"}m${report.failed}\x1b[0m`,
  );
  console.log(divider + "\n");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const { type, id, help } = parseArgs();

  if (help) {
    console.log(`
Studio Ordo Eval Harness
========================
Usage: npm run evals [-- [options]]

Options:
  --type <type>   Run only scenarios of this type (intake-agent, triage, workflow)
  --id   <id>     Run only the scenario with this ID
  --help          Show this message

Environment:
  ANTHROPIC_API_KEY  Required for intake-agent and triage scenarios
  ANTHROPIC_MODEL    Claude model to use (default: claude-sonnet-4-6)
    `);
    process.exit(0);
  }

  // Validate API key for scenarios that need it
  const anthropicKey =
    process.env.ANTHROPIC_API_KEY ?? process.env.API__ANTHROPIC_API_KEY;

  if (!anthropicKey) {
    console.error(
      "\x1b[31mError: ANTHROPIC_API_KEY is required.\x1b[0m\n" +
        "Set it in .env.local:\n" +
        "  ANTHROPIC_API_KEY=sk-ant-api03-...\n",
    );
    process.exit(2);
  }

  // Gather all scenarios
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    console.warn(
      "\x1b[33m⚠ Skipping content-retrieval evals — OPENAI_API_KEY not set\x1b[0m",
    );
  }

  let allScenarios: EvalScenario[] = [
    ...intakeAgentScenarios,
    ...triageScenarios,
    ...workflowScenarios,
    ...(openaiKey ? contentRetrievalScenarios : []),
    ...maestroScenarios,
    ...journeyFScenarios,
    ...commerceScenarios,
    ...prospectScenarios,
    ...eventScenarios,
    ...membershipScenarios,
    ...affiliateScenarios,
    ...intelScenarios,
  ];

  // Apply filters
  if (type) {
    allScenarios = allScenarios.filter((s) => s.type === type);
    if (allScenarios.length === 0) {
      console.error(`No scenarios found with type "${type}"`);
      process.exit(2);
    }
  }

  if (id) {
    allScenarios = allScenarios.filter((s) => s.id === id);
    if (allScenarios.length === 0) {
      console.error(`No scenario found with id "${id}"`);
      process.exit(2);
    }
  }

  console.log(
    `\nRunning ${allScenarios.length} scenario(s) against ${process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6"}...`,
  );

  try {
    const report = await runAllScenarios(allScenarios);

    const reportPath = await writeReport(report);
    printSummary(report);
    console.log(`Report written to: ${reportPath}\n`);

    if (report.failed > 0) {
      console.log(
        `\x1b[33m⚠  ${report.failed} scenario(s) need human review.\x1b[0m\n`,
      );
      process.exit(1);
    } else {
      console.log("\x1b[32m✓ All scenarios passed.\x1b[0m\n");
      process.exit(0);
    }
  } finally {
    await teardownAllEvalDbs();
  }
}

main().catch((err) => {
  console.error("\nEval harness crashed:", err);
  process.exit(2);
});
