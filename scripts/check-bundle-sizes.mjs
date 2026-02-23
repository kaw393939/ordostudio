import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { gzipSync } from "node:zlib";

const BASE_URL = process.env.BUNDLE_BASE_URL ?? "http://localhost:3000";
const OUTPUT_DIR = join(process.cwd(), "tmp", "bundle-sizes");
const MAX_GZIP_KB = Number(process.env.BUNDLE_MAX_GZIP_KB ?? 200);
const STRICT_PRODUCTION_RUNTIME = process.env.BUNDLE_STRICT_PRODUCTION_RUNTIME !== "false";

const DEFAULT_ROUTES = ["/", "/events", "/events/lighthouse-open", "/login", "/register"];
const ROUTES = (process.env.BUNDLE_ROUTES ? process.env.BUNDLE_ROUTES.split(",") : DEFAULT_ROUTES)
  .map((route) => route.trim())
  .filter(Boolean);

const ensureBaseUrlAvailable = async () => {
  try {
    const response = await fetch(`${BASE_URL}/api/v1`, { method: "GET" });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
  } catch (error) {
    throw new Error(`Cannot reach ${BASE_URL}. Start the app first (e.g., npm run build && npm run start). ${String(error)}`);
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
        "Bundle-size gate requires production runtime (`next start`), but a dev runtime marker was detected.",
        `Detected marker(s): ${detected.join(", ")}`,
        "Stop any `next dev` process and run: npm run build && npm run start -- --port 3000",
        "To bypass only for local experiments, set BUNDLE_STRICT_PRODUCTION_RUNTIME=false.",
      ].join("\n"),
    );
  }
};

const fetchTextOrThrow = async (url, { headers } = {}) => {
  const response = await fetch(url, { method: "GET", headers });
  if (!response.ok) {
    throw new Error(`GET ${url} failed: HTTP ${response.status}`);
  }

  return response.text();
};

const fetchBufferOrThrow = async (url, { headers } = {}) => {
  const response = await fetch(url, { method: "GET", headers });
  if (!response.ok) {
    throw new Error(`GET ${url} failed: HTTP ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
};

const extractNextScriptSrcs = (html) => {
  const scriptSrcs = [];
  const regex = /<script[^>]+src=\"([^\"]+)\"/g;
  let match;
  while ((match = regex.exec(html))) {
    const src = match[1];
    if (!src || !src.startsWith("/_next/") || !src.endsWith(".js")) {
      continue;
    }

    scriptSrcs.push(src);
  }

  return [...new Set(scriptSrcs)];
};

const kb = (bytes) => bytes / 1024;

const intersectSets = (sets) => {
  if (sets.length === 0) {
    return new Set();
  }

  const [first, ...rest] = sets;
  const intersection = new Set(first);
  for (const set of rest) {
    for (const value of intersection) {
      if (!set.has(value)) {
        intersection.delete(value);
      }
    }
  }

  return intersection;
};

const main = async () => {
  await ensureBaseUrlAvailable();
  await assertProductionRuntime();
  await mkdir(OUTPUT_DIR, { recursive: true });

  const chunkCache = new Map();
  const routes = [];
  const failures = [];

  for (const path of ROUTES) {
    const url = `${BASE_URL}${path}`;
    const html = await fetchTextOrThrow(url);

    const scriptSrcs = extractNextScriptSrcs(html);
    if (scriptSrcs.length === 0) {
      failures.push(`${path} did not include any /_next/*.js script tags to measure.`);
      routes.push({ path, url, gzipBytes: 0, gzipKb: 0, chunks: [] });
      continue;
    }

    let routeGzipBytes = 0;
    const chunks = [];

    for (const src of scriptSrcs) {
      const chunkUrl = `${BASE_URL}${src}`;
      let gzipBytes;

      if (chunkCache.has(src)) {
        gzipBytes = chunkCache.get(src);
      } else {
        const js = await fetchBufferOrThrow(chunkUrl);
        gzipBytes = gzipSync(js).byteLength;
        chunkCache.set(src, gzipBytes);
      }

      routeGzipBytes += gzipBytes;
      chunks.push({ src, gzipBytes, gzipKb: kb(gzipBytes) });
    }

    const gzipKb = kb(routeGzipBytes);
    routes.push({ path, url, gzipBytes: routeGzipBytes, gzipKb, chunks });
  }

  const routeChunkSets = routes.map((route) => new Set(route.chunks.map((chunk) => chunk.src)));
  const sharedChunkSrcs = intersectSets(routeChunkSets);
  const sharedGzipBytes = [...sharedChunkSrcs].reduce((total, src) => total + (chunkCache.get(src) ?? 0), 0);
  const sharedGzipKb = kb(sharedGzipBytes);

  for (const route of routes) {
    const incrementalBytes = route.chunks
      .filter((chunk) => !sharedChunkSrcs.has(chunk.src))
      .reduce((total, chunk) => total + chunk.gzipBytes, 0);
    const incrementalKb = kb(incrementalBytes);

    route.sharedGzipBytes = sharedGzipBytes;
    route.sharedGzipKb = sharedGzipKb;
    route.incrementalGzipBytes = incrementalBytes;
    route.incrementalGzipKb = incrementalKb;
    route.sharedChunkCount = sharedChunkSrcs.size;
    route.routeChunkCount = route.chunks.length;

    if (incrementalKb > MAX_GZIP_KB) {
      failures.push(`${route.path} incremental JS gzip=${incrementalKb.toFixed(1)}KB exceeds ${MAX_GZIP_KB}KB`);
    }
  }

  const payload = {
    baseUrl: BASE_URL,
    maxGzipKb: MAX_GZIP_KB,
    auditedAt: new Date().toISOString(),
    shared: {
      chunkCount: sharedChunkSrcs.size,
      gzipBytes: sharedGzipBytes,
      gzipKb: sharedGzipKb,
    },
    routes,
    failures,
  };

  await writeFile(join(OUTPUT_DIR, "summary.json"), JSON.stringify(payload, null, 2), "utf8");

  const markdownLines = [
    "# Bundle Size Summary",
    "",
    `Base URL: ${BASE_URL}`,
    `Max per-route incremental JS (gzipped): ${MAX_GZIP_KB}KB`,
    `Shared across all audited routes: ${payload.shared.gzipKb.toFixed(1)}KB (${payload.shared.chunkCount} chunks)`,
    "",
    "| Route | Total JS gzip (KB) | Incremental JS gzip (KB) | Status |",
    "| --- | ---: | ---: | --- |",
    ...routes.map((route) => {
      const incrementalKb = Number(route.incrementalGzipKb ?? 0);
      const status = incrementalKb > MAX_GZIP_KB ? "fail" : "pass";
      return `| ${route.path} | ${route.gzipKb.toFixed(1)} | ${incrementalKb.toFixed(1)} | ${status} |`;
    }),
    "",
  ];

  if (failures.length > 0) {
    markdownLines.push("## Failures", "", ...failures.map((entry) => `- ${entry}`), "");
  }

  await writeFile(join(OUTPUT_DIR, "summary.md"), markdownLines.join("\n"), "utf8");

  process.stdout.write(`Bundle-size summary written to ${OUTPUT_DIR}/summary.md\n`);

  if (failures.length > 0) {
    process.stderr.write(`\nBundle-size gate failures:\n- ${failures.join("\n- ")}\n`);
    process.exitCode = 1;
  }
};

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
