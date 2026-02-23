import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const OUTPUT_DIR = join(process.cwd(), "tmp", "lighthouse");

const args = process.argv.slice(2);
const getArg = (name, fallback) => {
  const index = args.indexOf(name);
  if (index === -1 || index + 1 >= args.length) {
    return fallback;
  }

  return args[index + 1];
};

const basePath = getArg("--base", join(OUTPUT_DIR, "baseline-summary.json"));
const currentPath = getArg("--current", join(OUTPUT_DIR, "summary.json"));
const warnThreshold = Number(process.env.LH_DELTA_WARN ?? 2);
const failThreshold = Number(process.env.LH_DELTA_FAIL ?? 5);

const normalizeRows = (payload) => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (payload && typeof payload === "object" && Array.isArray(payload.audited)) {
    return payload.audited;
  }

  return [];
};

const keyFor = (row) => `${row.area ?? "unknown"}::${row.path ?? row.url ?? "unknown"}`;

const parseScore = (value) => (typeof value === "number" ? value : 0);

const parseJson = async (path) => {
  const content = await readFile(path, "utf8");
  return JSON.parse(content);
};

const toDelta = (baselineRows, currentRows) => {
  const baselineByKey = new Map(baselineRows.map((row) => [keyFor(row), row]));
  const deltas = [];

  for (const current of currentRows) {
    const baseline = baselineByKey.get(keyFor(current));
    if (!baseline) {
      deltas.push({
        area: current.area ?? "unknown",
        path: current.path ?? current.url ?? "unknown",
        status: "new",
        deltas: null,
      });
      continue;
    }

    const deltaScores = {
      performance: parseScore(current.scores?.performance) - parseScore(baseline.scores?.performance),
      accessibility: parseScore(current.scores?.accessibility) - parseScore(baseline.scores?.accessibility),
      "best-practices": parseScore(current.scores?.["best-practices"]) - parseScore(baseline.scores?.["best-practices"]),
      seo: parseScore(current.scores?.seo) - parseScore(baseline.scores?.seo),
    };

    deltas.push({
      area: current.area ?? "unknown",
      path: current.path ?? current.url ?? "unknown",
      status: "compared",
      deltas: deltaScores,
    });
  }

  return deltas;
};

const formatDelta = (value) => (value > 0 ? `+${value}` : `${value}`);

const renderMarkdown = (rows) => {
  const lines = [
    "# Lighthouse Delta",
    "",
    `- Base: ${basePath}`,
    `- Current: ${currentPath}`,
    `- Warn threshold: -${warnThreshold}`,
    `- Fail threshold: -${failThreshold}`,
    "",
    "| Area | Page | Perf Δ | A11y Δ | BP Δ | SEO Δ | Status |",
    "| --- | --- | ---: | ---: | ---: | ---: | --- |",
  ];

  for (const row of rows) {
    if (row.status === "new" || !row.deltas) {
      lines.push(`| ${row.area} | ${row.path} | n/a | n/a | n/a | n/a | new |`);
      continue;
    }

    lines.push(
      `| ${row.area} | ${row.path} | ${formatDelta(row.deltas.performance)} | ${formatDelta(row.deltas.accessibility)} | ${formatDelta(row.deltas["best-practices"])} | ${formatDelta(row.deltas.seo)} | compared |`,
    );
  }

  lines.push("");
  return lines.join("\n");
};

const collectRegressions = (rows) => {
  const warnings = [];
  const failures = [];

  for (const row of rows) {
    if (row.status !== "compared" || !row.deltas) {
      continue;
    }

    for (const [category, delta] of Object.entries(row.deltas)) {
      if (delta <= -failThreshold) {
        failures.push(`${row.area} ${row.path} ${category} delta=${delta}`);
      } else if (delta <= -warnThreshold) {
        warnings.push(`${row.area} ${row.path} ${category} delta=${delta}`);
      }
    }
  }

  return { warnings, failures };
};

const main = async () => {
  await mkdir(OUTPUT_DIR, { recursive: true });

  let baselineRows = [];
  try {
    baselineRows = normalizeRows(await parseJson(basePath));
  } catch {
    process.stdout.write(`No baseline found at ${basePath}; skipping delta comparison.\n`);
  }

  const currentRows = normalizeRows(await parseJson(currentPath));
  if (currentRows.length === 0) {
    throw new Error(`No auditable rows found in ${currentPath}.`);
  }

  const deltas = toDelta(baselineRows, currentRows);
  const markdown = renderMarkdown(deltas);
  const regression = collectRegressions(deltas);

  await writeFile(join(OUTPUT_DIR, "delta.json"), JSON.stringify({ basePath, currentPath, deltas, regression }, null, 2), "utf8");
  await writeFile(join(OUTPUT_DIR, "delta.md"), markdown, "utf8");

  process.stdout.write(`${markdown}\n`);

  if (regression.warnings.length > 0) {
    process.stdout.write(`\nLighthouse warnings:\n- ${regression.warnings.join("\n- ")}\n`);
  }

  if (regression.failures.length > 0) {
    process.stderr.write(`\nLighthouse regressions exceeded fail threshold:\n- ${regression.failures.join("\n- ")}\n`);
    process.exitCode = 1;
  }
};

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
