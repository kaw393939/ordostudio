import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(__dirname, "../..");
const SRC = join(ROOT, "src");
const ENV_EXAMPLE = join(ROOT, ".env.example");

/**
 * Recursively collect all .ts/.tsx files under a directory,
 * excluding test files and node_modules.
 */
function collectSourceFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      if (entry === "node_modules" || entry === "__tests__") continue;
      results.push(...collectSourceFiles(full));
    } else if (/\.(ts|tsx)$/.test(entry) && !entry.includes(".test.")) {
      results.push(full);
    }
  }
  return results;
}

/**
 * Extract env var names from .env.example (lines like VAR_NAME=value or VAR_NAME=).
 */
function parseEnvExample(content: string): Set<string> {
  const vars = new Set<string>();
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^([A-Z_][A-Z0-9_]*)=/);
    if (match) vars.add(match[1]);
  }
  return vars;
}

/**
 * Extract process.env.X references from source files.
 * Excludes NODE_ENV since it's a universal Node.js convention.
 */
function findEnvReferences(files: string[]): Set<string> {
  const refs = new Set<string>();
  const pattern = /process\.env\.([A-Z_][A-Z0-9_]*)/g;
  for (const file of files) {
    const content = readFileSync(file, "utf-8");
    for (const match of content.matchAll(pattern)) {
      const varName = match[1];
      // NODE_ENV is universal and doesn't need .env documentation
      if (varName !== "NODE_ENV") {
        refs.add(varName);
      }
    }
  }
  return refs;
}

describe("env documentation guard", () => {
  it(".env.example exists", () => {
    expect(() => readFileSync(ENV_EXAMPLE, "utf-8")).not.toThrow();
  });

  it("every process.env reference in source is documented in .env.example", () => {
    const envContent = readFileSync(ENV_EXAMPLE, "utf-8");
    const documented = parseEnvExample(envContent);
    const sourceFiles = collectSourceFiles(SRC);
    const referenced = findEnvReferences(sourceFiles);

    const undocumented = [...referenced].filter((v) => !documented.has(v));

    expect(
      undocumented,
      `Undocumented env vars found in source: ${undocumented.join(", ")}. ` +
        `Add them to .env.example.`,
    ).toEqual([]);
  });

  it(".env.example documents at least 20 variables", () => {
    const envContent = readFileSync(ENV_EXAMPLE, "utf-8");
    const documented = parseEnvExample(envContent);
    expect(documented.size).toBeGreaterThanOrEqual(20);
  });
});
