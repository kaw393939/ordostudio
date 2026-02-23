/**
 * Platform-layer configuration resolution.
 *
 * Loads and merges configuration from config files, environment variables,
 * and defaults. This is framework-agnostic — the CLI delivery layer adds
 * its own flag overrides on top.
 */
import { cosmiconfig } from "cosmiconfig";
import { z } from "zod";
import type { AppConfig } from "./types";

// ── schemas ──────────────────────────────────────────────────────────

const envSchema = z.enum(["local", "staging", "prod"]);

const configFileSchema = z.object({
  env: envSchema.optional(),
  db: z
    .object({
      mode: z.literal("sqlite").optional(),
      file: z.string().min(1).optional(),
      busyTimeoutMs: z.number().int().positive().optional(),
    })
    .optional(),
  security: z
    .object({
      requireTokenInStaging: z.boolean().optional(),
      requireTokenInProd: z.boolean().optional(),
      dangerousOpsRequireExplicitProd: z.boolean().optional(),
    })
    .optional(),
  audit: z
    .object({
      strict: z.boolean().optional(),
    })
    .optional(),
  output: z
    .object({
      defaultFormat: z.enum(["text", "json"]).optional(),
    })
    .optional(),
});

export type ConfigFileShape = z.infer<typeof configFileSchema>;

// ── defaults ─────────────────────────────────────────────────────────

export const defaultConfig: AppConfig = {
  env: "local",
  db: {
    mode: "sqlite",
    file: "./data/app.db",
    busyTimeoutMs: 5000,
  },
  security: {
    requireTokenInStaging: true,
    requireTokenInProd: true,
    dangerousOpsRequireExplicitProd: true,
  },
  audit: {
    strict: true,
  },
  output: {
    defaultFormat: "text",
  },
};

// ── helpers ──────────────────────────────────────────────────────────

const toBool = (value: string | undefined): boolean | undefined => {
  if (value === undefined) return undefined;
  if (value.toLowerCase() === "true") return true;
  if (value.toLowerCase() === "false") return false;
  return undefined;
};

const parseEnv = (envVars: NodeJS.ProcessEnv): ConfigFileShape => {
  const env = envSchema.safeParse(envVars.APPCTL_ENV);
  const outputFormat = z.enum(["text", "json"]).safeParse(envVars.APPCTL_OUTPUT_FORMAT);

  return {
    env: env.success ? env.data : undefined,
    db: {
      mode: "sqlite",
      file: envVars.APPCTL_DB_FILE,
      busyTimeoutMs: envVars.APPCTL_DB_BUSY_TIMEOUT_MS
        ? Number(envVars.APPCTL_DB_BUSY_TIMEOUT_MS)
        : undefined,
    },
    security: {
      requireTokenInStaging: toBool(envVars.APPCTL_REQUIRE_TOKEN_STAGING),
      requireTokenInProd: toBool(envVars.APPCTL_REQUIRE_TOKEN_PROD),
      dangerousOpsRequireExplicitProd: toBool(envVars.APPCTL_DANGEROUS_REQUIRE_EXPLICIT_PROD),
    },
    audit: {
      strict: toBool(envVars.APPCTL_AUDIT_STRICT),
    },
    output: {
      defaultFormat: outputFormat.success ? outputFormat.data : undefined,
    },
  };
};

export const mergeConfig = (base: AppConfig, incoming: ConfigFileShape): AppConfig => ({
  env: incoming.env ?? base.env,
  db: {
    mode: incoming.db?.mode ?? base.db.mode,
    file: incoming.db?.file ?? base.db.file,
    busyTimeoutMs: incoming.db?.busyTimeoutMs ?? base.db.busyTimeoutMs,
  },
  security: {
    requireTokenInStaging:
      incoming.security?.requireTokenInStaging ?? base.security.requireTokenInStaging,
    requireTokenInProd: incoming.security?.requireTokenInProd ?? base.security.requireTokenInProd,
    dangerousOpsRequireExplicitProd:
      incoming.security?.dangerousOpsRequireExplicitProd ??
      base.security.dangerousOpsRequireExplicitProd,
  },
  audit: {
    strict: incoming.audit?.strict ?? base.audit.strict,
  },
  output: {
    defaultFormat: incoming.output?.defaultFormat ?? base.output.defaultFormat,
  },
});

// ── public API ───────────────────────────────────────────────────────

export interface ResolveConfigInput {
  fileConfig?: ConfigFileShape;
  envVars?: NodeJS.ProcessEnv;
}

/**
 * Build an AppConfig by merging defaults → config file → environment variables.
 *
 * CLI-specific flag overrides (--env, --json) are NOT handled here;
 * the CLI delivery layer applies those on top.
 */
export const resolveConfig = ({
  fileConfig,
  envVars = process.env,
}: ResolveConfigInput): AppConfig => {
  let resolved = mergeConfig(defaultConfig, fileConfig ?? {});
  resolved = mergeConfig(resolved, parseEnv(envVars));
  return resolved;
};

const searchPlaces = [
  "appctl.config.json",
  ".appctlrc",
  ".appctlrc.json",
  ".appctlrc.yaml",
  ".appctlrc.yml",
];

export const loadConfigFromDisk = async (
  cwd = process.cwd(),
): Promise<ConfigFileShape | undefined> => {
  const explorer = cosmiconfig("appctl", {
    stopDir: cwd,
    searchPlaces,
  });

  const result = await explorer.search(cwd);
  if (!result) return undefined;
  return configFileSchema.parse(result.config);
};
