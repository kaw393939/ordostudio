/**
 * CLI-layer config wrapper.
 *
 * Delegates to the platform-layer resolveConfig and adds CLI-specific
 * flag overrides (--env, --json). Non-CLI consumers should import
 * directly from "@/platform/config".
 */
import {
  resolveConfig as platformResolveConfig,
  loadConfigFromDisk,
  defaultConfig,
  type ConfigFileShape,
} from "@/platform/config";
import type { AppConfig } from "@/platform/types";
import type { GlobalOptions } from "./types";

// Re-export platform symbols so existing cli/ callers don't break
export { loadConfigFromDisk, defaultConfig };

interface ResolveConfigInput {
  fileConfig?: ConfigFileShape;
  envVars?: NodeJS.ProcessEnv;
  flags?: GlobalOptions;
}

export const resolveConfig = ({
  fileConfig,
  envVars = process.env,
  flags,
}: ResolveConfigInput): AppConfig => {
  const resolved = platformResolveConfig({ fileConfig, envVars });

  if (flags?.env) {
    resolved.env = flags.env;
  }

  if (flags?.json) {
    resolved.output.defaultFormat = "json";
  }

  return resolved;
};
