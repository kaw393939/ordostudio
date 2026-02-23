import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const workspaceRoot = process.cwd();

const TARGET_DIRS = [
  "src/components/primitives",
  "src/components/patterns",
  "src/components/layout",
  "src/lib/view-models",
];

const TARGET_EXTENSIONS = new Set([".ts", ".tsx"]);

const forbiddenPatterns = [
  {
    regex: /#[0-9a-fA-F]{3,8}/,
    message: "Hard-coded hex colors are not allowed in foundation layers.",
  },
  {
    regex: /text-(red|green|blue|zinc|gray|slate|stone|amber|violet|pink|orange)-\d{2,3}/,
    message: "Raw Tailwind color utility found; use semantic tokens instead.",
  },
  {
    regex: /bg-(red|green|blue|zinc|gray|slate|stone|amber|violet|pink|orange)-\d{2,3}/,
    message: "Raw Tailwind background color utility found; use semantic tokens instead.",
  },
  {
    regex: /border-(red|green|blue|zinc|gray|slate|stone|amber|violet|pink|orange)-\d{2,3}/,
    message: "Raw Tailwind border color utility found; use semantic tokens instead.",
  },
  {
    regex: /requestHal<|fetch\(/,
    message: "Network/data fetching is not allowed in foundation component layers.",
  },
  {
    regex: /problem\./,
    message: "ProblemDetails object coupling not allowed in foundation layers.",
    includePaths: ["src/components/primitives", "src/components/layout"],
  },
];

const violations = [];

function walk(directory) {
  for (const entry of readdirSync(directory)) {
    const fullPath = path.join(directory, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      walk(fullPath);
      continue;
    }

    if (!TARGET_EXTENSIONS.has(path.extname(fullPath))) {
      continue;
    }

    const relPath = path.relative(workspaceRoot, fullPath).replace(/\\/g, "/");
    const source = readFileSync(fullPath, "utf8");

    for (const rule of forbiddenPatterns) {
      if (rule.includePaths && !rule.includePaths.some((targetPath) => relPath.startsWith(targetPath))) {
        continue;
      }

      if (rule.regex.test(source)) {
        violations.push(`${relPath}: ${rule.message}`);
      }
    }
  }
}

for (const dir of TARGET_DIRS) {
  const absolute = path.join(workspaceRoot, dir);
  walk(absolute);
}

if (violations.length > 0) {
  console.error("UI guardrail violations found:\n");
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log("UI guardrails check passed.");
