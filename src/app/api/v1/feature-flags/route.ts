import { readFile } from "node:fs/promises";

import { getBuildTimeFeatureFlags, mergeFeatureFlags, type FeatureFlags } from "@/lib/feature-flags";
import { hal } from "@/lib/api/response";
import { withRequestLogging } from "@/lib/api/request-logging";

const parseJsonFlags = (raw: string): Partial<FeatureFlags> | null => {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    return parsed as Partial<FeatureFlags>;
  } catch {
    return null;
  }
};

const loadRuntimeFlags = async (): Promise<Partial<FeatureFlags> | null> => {
  const filePath = process.env.APP_RUNTIME_FEATURE_FLAGS_FILE;
  if (filePath) {
    try {
      const raw = await readFile(filePath, "utf8");
      return parseJsonFlags(raw);
    } catch {
      // fallthrough
    }
  }

  const rawEnv = process.env.APP_RUNTIME_FEATURE_FLAGS_JSON;
  if (rawEnv) {
    return parseJsonFlags(rawEnv);
  }

  return null;
};

async function _GET() {
  const buildTime = getBuildTimeFeatureFlags();
  const runtime = await loadRuntimeFlags();

  return hal(
    {
      flags: mergeFeatureFlags(buildTime, runtime),
      runtime_loaded: Boolean(runtime),
    },
    {
      self: { href: "/api/v1/feature-flags" },
    },
    {
      headers: {
        "cache-control": "no-store",
      },
    },
  );
}

export const GET = withRequestLogging(_GET);
