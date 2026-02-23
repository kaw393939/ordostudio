/**
 * Architecture Boundary Tests
 *
 * These tests enforce the Clean Architecture dependency rule:
 *
 *   core/  →  (nothing outside core/ or platform/)
 *   platform/  →  (nothing outside platform/ or core/)
 *   adapters/  →  core/, platform/ only (not delivery/)
 *   delivery (cli/, lib/, app/, components/)  →  anything
 *
 * Any violation makes the build fail fast.
 */
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const SRC_DIR = join(__dirname, "..");

// ── helpers ──────────────────────────────────────────────────────────

/** Recursively collect all .ts/.tsx files under `dir`, excluding test files. */
function collectTsFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (entry === "__tests__" || entry === "node_modules") continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      results.push(...collectTsFiles(full));
    } else if (/\.(ts|tsx)$/.test(entry) && !entry.endsWith(".d.ts") && !entry.endsWith(".test.ts") && !entry.endsWith(".spec.ts")) {
      results.push(full);
    }
  }
  return results;
}

/** Extract import paths from a source file's text content. */
function extractImportPaths(content: string): string[] {
  const paths: string[] = [];
  // Match: import ... from "..." or import ... from '...'
  const importRegex = /(?:import|export)\s+.*?\s+from\s+["']([^"']+)["']/g;
  // Match: import "..." (side-effect imports)
  const sideEffectRegex = /import\s+["']([^"']+)["']/g;

  let match: RegExpExecArray | null;
  while ((match = importRegex.exec(content)) !== null) {
    paths.push(match[1]);
  }
  while ((match = sideEffectRegex.exec(content)) !== null) {
    paths.push(match[1]);
  }
  return paths;
}

/** Resolve an import path to a canonical layer name. */
function resolveLayer(importPath: string): string | null {
  // Handle @/ alias paths
  if (importPath.startsWith("@/")) {
    const rest = importPath.slice(2);
    if (rest.startsWith("core/")) return "core";
    if (rest.startsWith("platform/")) return "platform";
    if (rest.startsWith("adapters/")) return "adapters";
    if (rest.startsWith("cli/")) return "delivery";
    if (rest.startsWith("lib/")) return "delivery";
    if (rest.startsWith("app/")) return "delivery";
    if (rest.startsWith("components/")) return "delivery";
    return null; // unknown @/ import
  }

  // Handle relative paths: ../cli/, ../../lib/, etc.
  if (importPath.startsWith(".")) {
    if (importPath.includes("/cli/") || importPath.endsWith("/cli")) return "delivery";
    if (importPath.includes("/lib/") || importPath.endsWith("/lib")) return "delivery";
    if (importPath.includes("/app/") || importPath.endsWith("/app")) return "delivery";
    if (importPath.includes("/components/")) return "delivery";
    if (importPath.includes("/core/")) return "core";
    if (importPath.includes("/platform/")) return "platform";
    if (importPath.includes("/adapters/")) return "adapters";
    return null; // relative import within the same layer — fine
  }

  // Node/npm package — not a layer concern
  return null;
}

/** Rules: map of layer → forbidden target layers */
const FORBIDDEN: Record<string, string[]> = {
  core: ["delivery", "adapters"],
  platform: ["delivery"],
  adapters: ["delivery"],
  // delivery has no restrictions — it's the outermost ring
};

interface Violation {
  file: string;
  importPath: string;
  sourceLayer: string;
  targetLayer: string;
}

function findViolations(layer: string, dir: string): Violation[] {
  const violations: Violation[] = [];
  const dirPath = join(SRC_DIR, dir);

  let files: string[];
  try {
    files = collectTsFiles(dirPath);
  } catch {
    // Directory doesn't exist yet — no violations possible
    return [];
  }

  const forbidden = FORBIDDEN[layer] ?? [];

  for (const file of files) {
    const content = readFileSync(file, "utf-8");
    const imports = extractImportPaths(content);

    for (const imp of imports) {
      const target = resolveLayer(imp);
      if (target && forbidden.includes(target)) {
        violations.push({
          file: relative(SRC_DIR, file),
          importPath: imp,
          sourceLayer: layer,
          targetLayer: target,
        });
      }
    }
  }
  return violations;
}

// ── tests ────────────────────────────────────────────────────────────

describe("Architecture Boundaries — Dependency Rule", () => {
  it("core/ must not import from delivery (cli, lib, app, components)", () => {
    const violations = findViolations("core", "core");
    if (violations.length > 0) {
      const report = violations
        .map((v) => `  ${v.file}  →  ${v.importPath}  (${v.sourceLayer} → ${v.targetLayer})`)
        .join("\n");
      expect.fail(`Found ${violations.length} boundary violation(s):\n${report}`);
    }
  });

  it("core/ must not import from adapters/", () => {
    const violations = findViolations("core", "core").filter((v) => v.targetLayer === "adapters");
    if (violations.length > 0) {
      const report = violations
        .map((v) => `  ${v.file}  →  ${v.importPath}  (${v.sourceLayer} → ${v.targetLayer})`)
        .join("\n");
      expect.fail(`Found ${violations.length} boundary violation(s):\n${report}`);
    }
  });

  it("platform/ must not import from delivery (cli, lib, app, components)", () => {
    const violations = findViolations("platform", "platform");
    if (violations.length > 0) {
      const report = violations
        .map((v) => `  ${v.file}  →  ${v.importPath}  (${v.sourceLayer} → ${v.targetLayer})`)
        .join("\n");
      expect.fail(`Found ${violations.length} boundary violation(s):\n${report}`);
    }
  });

  it("adapters/ must not import from delivery (cli, lib, app, components)", () => {
    const violations = findViolations("adapters", "adapters");
    if (violations.length > 0) {
      const report = violations
        .map((v) => `  ${v.file}  →  ${v.importPath}  (${v.sourceLayer} → ${v.targetLayer})`)
        .join("\n");
      expect.fail(`Found ${violations.length} boundary violation(s):\n${report}`);
    }
  });
});
