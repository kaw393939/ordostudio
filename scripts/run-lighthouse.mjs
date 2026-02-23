import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import lighthouse from "lighthouse";
import * as chromeLauncher from "chrome-launcher";

const BASE_URL = process.env.LIGHTHOUSE_BASE_URL ?? "http://localhost:3000";
const OUTPUT_DIR = join(process.cwd(), "tmp", "lighthouse");
const ROUTE_BUDGETS_PATH = process.env.LH_ROUTE_BUDGETS_PATH ?? join(process.cwd(), "scripts", "lighthouse-route-budgets.json");
const BUDGET_WAIVERS_PATH = process.env.LH_BUDGET_WAIVERS_PATH ?? join(process.cwd(), "scripts", "lighthouse-budget-waivers.json");

const PASSWORD = "Password123!";
const USER_EMAIL = "lighthouse-auth-user@example.com";
const ADMIN_EMAIL = "lighthouse-auth-admin@example.com";

const CATEGORIES = ["performance", "accessibility", "best-practices", "seo"];
const LIGHTHOUSE_THROTTLING_METHOD = process.env.LH_THROTTLING_METHOD ?? "provided";
const LIGHTHOUSE_DISABLE_STORAGE_RESET = process.env.LH_DISABLE_STORAGE_RESET === "true";
const THRESHOLDS = {
  performance: Number(process.env.LH_MIN_PERFORMANCE ?? 0.6),
  accessibility: Number(process.env.LH_MIN_ACCESSIBILITY ?? 0.9),
  "best-practices": Number(process.env.LH_MIN_BEST_PRACTICES ?? 0.9),
  seo: Number(process.env.LH_MIN_SEO ?? 0.9),
};

const CORE_WEB_VITALS_BUDGETS = {
  lcpMs: Number(process.env.LH_MAX_LCP_MS ?? 2500),
  inpMs: Number(process.env.LH_MAX_INP_MS ?? 200),
  cls: Number(process.env.LH_MAX_CLS ?? 0.1),
  tbtMs: Number(process.env.LH_MAX_TBT_MS ?? 300),
};

const CORE_WEB_VITALS_REQUIRED_PATHS = ["/", "/events", "/events/lighthouse-open", "/login", "/admin"];
const PUBLIC_SEO_REQUIRED_PATHS = ["/", "/events", "/events/lighthouse-open", "/login", "/register"];
const PUBLIC_SEO_MIN_SCORE = Number(process.env.LH_PUBLIC_SEO_MIN ?? 95);
const STRICT_SERVER_SHAPE = process.env.LH_STRICT_SERVER_SHAPE !== "false";
const STRICT_PRODUCTION_RUNTIME = process.env.LH_STRICT_PRODUCTION_RUNTIME !== "false";

const pages = {
  unauthenticated: ["/", "/events", "/events/lighthouse-open", "/events/lighthouse-full", "/login", "/register", "/privacy", "/terms"],
  authenticatedUser: ["/account", "/events/lighthouse-full"],
  authenticatedAdmin: [
    "/admin",
    "/admin/events",
    "/admin/audit",
    "/admin/users",
    "/admin/events/lighthouse-open",
    "/admin/events/lighthouse-open/registrations",
    "/admin/events/lighthouse-open/export",
  ],
};

const PAGE_OK_STATUSES = new Set([200]);
const SERVER_SHAPE_PATHS = [
  "/admin/users",
  "/admin/events/lighthouse-open",
  "/admin/events/lighthouse-open/registrations",
  "/admin/events/lighthouse-open/export",
];

const cliJson = (args, { allowFailure = false } = {}) => {
  const result = spawnSync("npm", ["run", "--silent", "cli", "--", "--env", "local", "--json", ...args], {
    cwd: process.cwd(),
    encoding: "utf8",
  });

  if (result.status !== 0 && !allowFailure) {
    throw new Error(`CLI failed: ${args.join(" ")}\n${result.stderr}`);
  }

  if (result.status !== 0) {
    return null;
  }

  const parsed = JSON.parse(result.stdout.trim());
  return parsed.data;
};

const ensureBaseUrlAvailable = async () => {
  try {
    const response = await fetch(`${BASE_URL}/api/v1`, { method: "GET" });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
  } catch (error) {
    throw new Error(`Cannot reach ${BASE_URL}. Start the app first (e.g., npm run dev). ${String(error)}`);
  }
};

const assertProductionRuntime = async () => {
  if (!STRICT_PRODUCTION_RUNTIME) {
    return;
  }

  const response = await fetch(`${BASE_URL}/`, { method: "GET" });
  if (!response.ok) {
    throw new Error(`Cannot verify production runtime at ${BASE_URL}/ (HTTP ${response.status}).`);
  }

  const html = await response.text();
  const devMarkers = ["[turbopack]", "next-devtools", "_dev_hmr-client", "next-dev"];
  const detected = devMarkers.filter((marker) => html.includes(marker));

  if (detected.length > 0) {
    throw new Error(
      [
        "Lighthouse gate requires production runtime (`next start`), but a dev runtime marker was detected.",
        `Detected marker(s): ${detected.join(", ")}`,
        "Stop any `next dev` process and run: npm run build && npm run start -- --port 3000",
        "To bypass only for local experiments, set LH_STRICT_PRODUCTION_RUNTIME=false.",
      ].join("\n"),
    );
  }
};

const registerAccount = async (email) => {
  const response = await fetch(`${BASE_URL}/api/v1/auth/register`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: BASE_URL,
    },
    body: JSON.stringify({ email, password: PASSWORD }),
  });

  if (response.status === 201 || response.status === 409) {
    return;
  }

  const detail = await response.text();
  throw new Error(`Register failed for ${email}: ${response.status} ${detail}`);
};

const loginAccount = async (email) => {
  const response = await fetch(`${BASE_URL}/api/v1/auth/login`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: BASE_URL,
    },
    body: JSON.stringify({ email, password: PASSWORD }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Login failed for ${email}: ${response.status} ${detail}`);
  }

  const cookie = response.headers.get("set-cookie");
  if (!cookie) {
    throw new Error(`Login succeeded but no session cookie returned for ${email}.`);
  }

  return cookie.split(";")[0];
};

const ensureAdminRole = () => {
  const user = cliJson(["user", "show", "--email", ADMIN_EMAIL]);
  if (!user?.id) {
    throw new Error(`Unable to resolve CLI user id for ${ADMIN_EMAIL}`);
  }

  const result = cliJson(["user", "role", "add", "--id", user.id, "--role", "ADMIN"], {
    allowFailure: true,
  });

  if (result) {
    return;
  }

  const verify = cliJson(["user", "show", "--email", ADMIN_EMAIL]);
  if (!verify?.roles?.includes("ADMIN")) {
    throw new Error(`Unable to ensure ADMIN role for ${ADMIN_EMAIL}`);
  }
};

const runAudit = async (chromePort, path, cookie, area) => {
  const url = `${BASE_URL}${path}`;
  const flags = {
    port: chromePort,
    output: "json",
    logLevel: "error",
    onlyCategories: CATEGORIES,
    throttlingMethod: LIGHTHOUSE_THROTTLING_METHOD,
    disableStorageReset: LIGHTHOUSE_DISABLE_STORAGE_RESET,
    formFactor: "desktop",
    screenEmulation: { mobile: false, width: 1350, height: 940, deviceScaleFactor: 1, disabled: false },
    extraHeaders: cookie ? { Cookie: cookie } : undefined,
  };

  const run = await lighthouse(url, flags);
  if (!run?.lhr || typeof run.report !== "string") {
    throw new Error(`No lighthouse report generated for ${url}`);
  }

  return {
    url,
    area,
    path,
    lhr: run.lhr,
    report: run.report,
  };
};

const getPageStatus = async (path, cookie) => {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: "GET",
    headers: cookie
      ? {
          Cookie: cookie,
        }
      : undefined,
    redirect: "manual",
  });

  return response.status;
};

const dedupe = (items) => [...new Set(items)];

const readJson = async (path) => {
  const content = await readFile(path, "utf8");
  return JSON.parse(content);
};

const loadRouteBudgetConfig = async () => {
  const config = await readJson(ROUTE_BUDGETS_PATH);
  if (!config || typeof config !== "object") {
    throw new Error(`Invalid route budget config at ${ROUTE_BUDGETS_PATH}`);
  }

  if (!config.tierBudgets || !config.areaDefaults) {
    throw new Error(`Route budget config missing required keys (tierBudgets, areaDefaults): ${ROUTE_BUDGETS_PATH}`);
  }

  return config;
};

const loadBudgetWaivers = async () => {
  try {
    const waivers = await readJson(BUDGET_WAIVERS_PATH);
    if (!Array.isArray(waivers)) {
      throw new Error("Waiver config must be an array.");
    }

    return waivers;
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return [];
    }

    throw new Error(`Invalid waiver config at ${BUDGET_WAIVERS_PATH}: ${error instanceof Error ? error.message : String(error)}`);
  }
};

const todayDateOnly = () => new Date().toISOString().slice(0, 10);

const getRouteTier = (budgetConfig, row) => {
  const routeOverrides = budgetConfig.routeOverrides ?? {};
  const overrideKey = `${row.area}::${row.path}`;
  const tier = routeOverrides[overrideKey] ?? budgetConfig.areaDefaults[row.area];

  if (!tier || !budgetConfig.tierBudgets[tier]) {
    throw new Error(`No budget tier configured for ${overrideKey}`);
  }

  return tier;
};

const findWaiver = (waivers, row, category) =>
  waivers.find((waiver) => waiver && waiver.area === row.area && waiver.path === row.path && waiver.category === category);

const evaluateBudgets = (summaryRows, budgetConfig, waivers) => {
  const failures = [];
  const warnings = [];
  const waived = [];
  const expired = [];
  const varianceBuffer = Number(budgetConfig.varianceBuffer ?? 0);
  const today = todayDateOnly();

  for (const row of summaryRows) {
    const tier = getRouteTier(budgetConfig, row);
    const tierBudget = budgetConfig.tierBudgets[tier];

    for (const category of CATEGORIES) {
      const baseMinimum = Number(tierBudget[category]);
      if (!Number.isFinite(baseMinimum)) {
        throw new Error(`Missing numeric ${category} budget for tier ${tier}`);
      }

      const minimum = Math.max(0, Math.min(100, Math.round(baseMinimum - varianceBuffer)));
      const score = Number(row.scores[category] ?? 0);
      if (score >= minimum) {
        continue;
      }

      const waiver = findWaiver(waivers, row, category);
      if (!waiver) {
        failures.push(`${row.area} ${row.path} ${category}=${score} below budget ${minimum}`);
        continue;
      }

      if (!waiver.owner || !waiver.reason || !waiver.expiresOn) {
        failures.push(`${row.area} ${row.path} ${category} has invalid waiver (owner/reason/expiresOn required)`);
        continue;
      }

      if (String(waiver.expiresOn) < today) {
        expired.push(`${row.area} ${row.path} ${category} waiver expired on ${waiver.expiresOn} (owner: ${waiver.owner})`);
        failures.push(`${row.area} ${row.path} ${category} waiver expired`);
        continue;
      }

      waived.push(`${row.area} ${row.path} ${category}=${score} below ${minimum}; waived until ${waiver.expiresOn} (${waiver.owner})`);
      warnings.push(`${row.area} ${row.path} ${category} budget miss was waived`);
    }
  }

  return { failures, warnings, waived, expired, varianceBuffer };
};

const resolveAuditablePaths = async (paths, cookie) => {
  const available = [];
  const skipped = [];

  for (const path of dedupe(paths)) {
    const status = await getPageStatus(path, cookie);
    if (PAGE_OK_STATUSES.has(status)) {
      available.push(path);
      continue;
    }

    skipped.push({ path, status, reason: status === 404 ? "not-found" : "unavailable" });
  }

  return { available, skipped };
};

const assertServerFreshness = async (adminCookie) => {
  if (!STRICT_SERVER_SHAPE) {
    return;
  }

  const failures = [];

  for (const path of SERVER_SHAPE_PATHS) {
    const status = await getPageStatus(path, adminCookie);
    if (!PAGE_OK_STATUSES.has(status)) {
      failures.push(`${path} -> HTTP ${status}`);
    }
  }

  if (failures.length > 0) {
    throw new Error(
      [
        "Localhost server shape check failed before Lighthouse run.",
        "This usually means localhost is serving a stale or wrong app instance.",
        "Restart your Next.js server in this workspace and retry.",
        `Failed checks: ${failures.join(", ")}`,
        "If this check must be bypassed temporarily, set LH_STRICT_SERVER_SHAPE=false.",
      ].join("\n"),
    );
  }
};

const getAuditValue = (lhr, auditKey) => {
  const value = lhr?.audits?.[auditKey]?.numericValue;
  return typeof value === "number" && Number.isFinite(value) ? value : null;
};

const getCoreWebVitals = (lhr) => {
  const lcpMs = getAuditValue(lhr, "largest-contentful-paint");
  const cls = getAuditValue(lhr, "cumulative-layout-shift");
  const tbtMs = getAuditValue(lhr, "total-blocking-time");

  const inpMs =
    getAuditValue(lhr, "interaction-to-next-paint") ??
    // Older Lighthouse builds used FID proxies; keep as fallback.
    getAuditValue(lhr, "max-potential-fid");

  return { lcpMs, inpMs, cls, tbtMs };
};

const summarize = (result) => {
  const metrics = getCoreWebVitals(result.lhr);

  return {
    area: result.area,
    path: result.path,
    url: result.url,
    scores: Object.fromEntries(
      CATEGORIES.map((category) => [category, Number(((result.lhr.categories[category]?.score ?? 0) * 100).toFixed(0))]),
    ),
    metrics,
  };
};

const assertThresholds = (summaryRows) => {
  const failures = [];

  for (const row of summaryRows) {
    for (const category of CATEGORIES) {
      const score = (row.scores[category] ?? 0) / 100;
      const minimum = THRESHOLDS[category];
      if (score < minimum) {
        failures.push(`${row.url} ${category}=${row.scores[category]} below ${(minimum * 100).toFixed(0)}`);
      }
    }
  }

  return failures;
};

const assertRequiredPathsPresent = (requiredPaths, summaryRows, skippedPages, label) => {
  const failures = [];

  for (const path of requiredPaths) {
    if (summaryRows.some((row) => row.path === path)) {
      continue;
    }

    const skipped = skippedPages.find((entry) => entry.path === path);
    if (skipped) {
      failures.push(`${label} required path missing: ${path} (skipped: HTTP ${skipped.status} ${skipped.reason})`);
    } else {
      failures.push(`${label} required path missing: ${path} (not audited)`);
    }
  }

  return failures;
};

const assertCoreWebVitalsBudgets = (summaryRows, skippedPages) => {
  const failures = [];

  failures.push(
    ...assertRequiredPathsPresent(CORE_WEB_VITALS_REQUIRED_PATHS, summaryRows, skippedPages, "Core Web Vitals"),
  );

  for (const row of summaryRows) {
    if (!CORE_WEB_VITALS_REQUIRED_PATHS.includes(row.path)) {
      continue;
    }

    const { lcpMs, inpMs, cls, tbtMs } = row.metrics ?? {};

    if (lcpMs == null || inpMs == null || cls == null || tbtMs == null) {
      failures.push(`${row.area} ${row.path} missing CWV metric(s) in report`);
      continue;
    }

    if (lcpMs > CORE_WEB_VITALS_BUDGETS.lcpMs) {
      failures.push(`${row.area} ${row.path} LCP=${Math.round(lcpMs)}ms above ${CORE_WEB_VITALS_BUDGETS.lcpMs}ms`);
    }
    if (inpMs > CORE_WEB_VITALS_BUDGETS.inpMs) {
      failures.push(`${row.area} ${row.path} INP=${Math.round(inpMs)}ms above ${CORE_WEB_VITALS_BUDGETS.inpMs}ms`);
    }
    if (cls > CORE_WEB_VITALS_BUDGETS.cls) {
      failures.push(`${row.area} ${row.path} CLS=${cls.toFixed(3)} above ${CORE_WEB_VITALS_BUDGETS.cls}`);
    }
    if (tbtMs > CORE_WEB_VITALS_BUDGETS.tbtMs) {
      failures.push(`${row.area} ${row.path} TBT=${Math.round(tbtMs)}ms above ${CORE_WEB_VITALS_BUDGETS.tbtMs}ms`);
    }
  }

  return failures;
};

const assertPublicSeoGate = (summaryRows, skippedPages) => {
  const failures = [];
  failures.push(...assertRequiredPathsPresent(PUBLIC_SEO_REQUIRED_PATHS, summaryRows, skippedPages, "Public SEO"));

  for (const row of summaryRows) {
    if (!PUBLIC_SEO_REQUIRED_PATHS.includes(row.path)) {
      continue;
    }

    const seo = Number(row.scores?.seo ?? 0);
    if (seo < PUBLIC_SEO_MIN_SCORE) {
      failures.push(`${row.area} ${row.path} seo=${seo} below ${PUBLIC_SEO_MIN_SCORE}`);
    }
  }

  return failures;
};

const writeReports = async (results, summaryRows, skippedPages, budgetResult, budgetConfig) => {
  await mkdir(OUTPUT_DIR, { recursive: true });

  for (const result of results) {
    const safeName = `${result.area}-${result.url}`
      .replace(/^https?:\/\//, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/-+$/g, "");
    await writeFile(join(OUTPUT_DIR, `${safeName}.report.json`), result.report, "utf8");
  }

  await writeFile(
    join(OUTPUT_DIR, "summary.json"),
    JSON.stringify(
      {
        thresholds: Object.fromEntries(
          Object.entries(THRESHOLDS).map(([category, min]) => [category, Number((min * 100).toFixed(0))]),
        ),
        coreWebVitalsBudgets: {
          requiredPaths: CORE_WEB_VITALS_REQUIRED_PATHS,
          budgets: CORE_WEB_VITALS_BUDGETS,
        },
        publicSeoGate: {
          requiredPaths: PUBLIC_SEO_REQUIRED_PATHS,
          minimumScore: PUBLIC_SEO_MIN_SCORE,
        },
        audited: summaryRows,
        skipped: skippedPages,
        routeBudgets: {
          configPath: ROUTE_BUDGETS_PATH,
          waiverPath: BUDGET_WAIVERS_PATH,
          varianceBuffer: budgetResult.varianceBuffer,
          failures: budgetResult.failures,
          warnings: budgetResult.warnings,
          waived: budgetResult.waived,
          expired: budgetResult.expired,
          tierBudgets: budgetConfig.tierBudgets,
          areaDefaults: budgetConfig.areaDefaults,
        },
      },
      null,
      2,
    ),
    "utf8",
  );

  const markdown = [
    "# Lighthouse Summary",
    "",
    `Base URL: ${BASE_URL}`,
    "",
    "| Area | Page | Performance | Accessibility | Best Practices | SEO |",
    "| --- | --- | ---: | ---: | ---: | ---: |",
    ...summaryRows.map(
      (row) =>
        `| ${row.area} | ${row.path} | ${row.scores.performance} | ${row.scores.accessibility} | ${row.scores["best-practices"]} | ${row.scores.seo} |`,
    ),
    "",
    "## Core Web Vitals (Required Routes)",
    "",
    `- Budgets: LCP < ${CORE_WEB_VITALS_BUDGETS.lcpMs}ms, INP < ${CORE_WEB_VITALS_BUDGETS.inpMs}ms, CLS < ${CORE_WEB_VITALS_BUDGETS.cls}, TBT < ${CORE_WEB_VITALS_BUDGETS.tbtMs}ms`,
    "",
    "| Area | Page | LCP (ms) | INP (ms) | CLS | TBT (ms) |",
    "| --- | --- | ---: | ---: | ---: | ---: |",
    ...summaryRows
      .filter((row) => CORE_WEB_VITALS_REQUIRED_PATHS.includes(row.path))
      .map((row) => {
        const metrics = row.metrics ?? {};
        const lcp = metrics.lcpMs == null ? "n/a" : Math.round(metrics.lcpMs);
        const inp = metrics.inpMs == null ? "n/a" : Math.round(metrics.inpMs);
        const cls = metrics.cls == null ? "n/a" : metrics.cls.toFixed(3);
        const tbt = metrics.tbtMs == null ? "n/a" : Math.round(metrics.tbtMs);
        return `| ${row.area} | ${row.path} | ${lcp} | ${inp} | ${cls} | ${tbt} |`;
      }),
    "",
    "## Legacy Table",
    "",
    "| Page | Performance | Accessibility | Best Practices | SEO |",
    "| --- | ---: | ---: | ---: | ---: |",
    ...summaryRows.map(
      (row) =>
        `| ${row.url.replace(BASE_URL, "")} | ${row.scores.performance} | ${row.scores.accessibility} | ${row.scores["best-practices"]} | ${row.scores.seo} |`,
    ),
    "",
    skippedPages.length
      ? [
          "## Skipped Pages",
          "",
          "| Page | Status | Reason |",
          "| --- | ---: | --- |",
          ...skippedPages.map((entry) => `| ${entry.path} | ${entry.status} | ${entry.reason} |`),
          "",
        ].join("\n")
      : "",
    "## Route Budget Gate",
    "",
    `- Budget config: ${ROUTE_BUDGETS_PATH}`,
    `- Waiver config: ${BUDGET_WAIVERS_PATH}`,
    `- Variance buffer: ${budgetResult.varianceBuffer}`,
    "",
    budgetResult.failures.length
      ? ["### Budget Failures", "", ...budgetResult.failures.map((entry) => `- ${entry}`), ""].join("\n")
      : "- No budget failures.",
    "",
    budgetResult.waived.length
      ? ["### Active Waivers", "", ...budgetResult.waived.map((entry) => `- ${entry}`), ""].join("\n")
      : "- No active waivers used.",
  ].join("\n");

  await writeFile(join(OUTPUT_DIR, "summary.md"), markdown, "utf8");
};

const main = async () => {
  await ensureBaseUrlAvailable();
  await assertProductionRuntime();

  const budgetConfig = await loadRouteBudgetConfig();
  const waivers = await loadBudgetWaivers();

  await registerAccount(USER_EMAIL);
  await registerAccount(ADMIN_EMAIL);
  ensureAdminRole();

  const userCookie = await loginAccount(USER_EMAIL);
  const adminCookie = await loginAccount(ADMIN_EMAIL);
  await assertServerFreshness(adminCookie);

  const chrome = await chromeLauncher.launch({
    chromeFlags: ["--headless=new", "--no-sandbox", "--disable-gpu"],
  });

  try {
    const audits = [];
    const skippedPages = [];

    const unauthResolved = await resolveAuditablePaths(pages.unauthenticated, null);
    skippedPages.push(...unauthResolved.skipped.map((entry) => ({ area: "unauthenticated", ...entry })));
    for (const path of unauthResolved.available) {
      audits.push(await runAudit(chrome.port, path, null, "unauthenticated"));
    }

    const userResolved = await resolveAuditablePaths(pages.authenticatedUser, userCookie);
    skippedPages.push(...userResolved.skipped.map((entry) => ({ area: "authenticatedUser", ...entry })));
    for (const path of userResolved.available) {
      audits.push(await runAudit(chrome.port, path, userCookie, "authenticatedUser"));
    }

    const adminResolved = await resolveAuditablePaths(pages.authenticatedAdmin, adminCookie);
    skippedPages.push(...adminResolved.skipped.map((entry) => ({ area: "authenticatedAdmin", ...entry })));
    for (const path of adminResolved.available) {
      audits.push(await runAudit(chrome.port, path, adminCookie, "authenticatedAdmin"));
    }

    if (audits.length === 0) {
      throw new Error("No auditable pages were available. Verify BASE_URL points to the running LMS app.");
    }

    const summaryRows = audits.map(summarize);
    const budgetResult = evaluateBudgets(summaryRows, budgetConfig, waivers);
    await writeReports(audits, summaryRows, skippedPages, budgetResult, budgetConfig);

    const failures = assertThresholds(summaryRows);
    failures.push(...assertCoreWebVitalsBudgets(summaryRows, skippedPages));
    failures.push(...assertPublicSeoGate(summaryRows, skippedPages));
    failures.push(...budgetResult.failures);

    process.stdout.write(`\nLighthouse summary written to ${OUTPUT_DIR}/summary.md\n`);

    if (failures.length > 0) {
      process.stderr.write(`\nLighthouse threshold failures:\n- ${failures.join("\n- ")}\n`);
      process.exitCode = 1;
      return;
    }

    if (skippedPages.length > 0) {
      process.stdout.write(
        `Skipped ${skippedPages.length} page(s) that were unavailable on ${BASE_URL}; see ${OUTPUT_DIR}/summary.md for details.\n`,
      );
    }

    if (budgetResult.warnings.length > 0) {
      process.stdout.write(`Budget warnings:\n- ${budgetResult.warnings.join("\n- ")}\n`);
    }

    process.stdout.write("Lighthouse thresholds passed.\n");
  } finally {
    await chrome.kill();
  }
};

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
