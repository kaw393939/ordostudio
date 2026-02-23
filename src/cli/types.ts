import type { RuntimeEnv } from "@/platform/types";

// Re-export shared config types from the canonical platform layer.
// cli/ consumers can keep importing from "./types" without changes.
export type {
  RuntimeEnv,
  DbConfig,
  SecurityConfig,
  AuditConfig,
  OutputConfig,
  AppConfig,
} from "@/platform/types";

export type OutputFormat = "text" | "json";

export type ExitCode = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface GlobalOptions {
  env?: RuntimeEnv;
  json?: boolean;
  quiet?: boolean;
  color?: boolean;
  trace?: boolean;
  dryRun?: boolean;
  yes?: boolean;
  token?: string;
}

export interface JsonEnvelope<TData = unknown> {
  ok: boolean;
  command: string;
  env: RuntimeEnv;
  data: TData;
  warnings: string[];
  errors: string[];
  request_id: string;
}

export interface CliIo {
  writeStdout(message: string): void;
  writeStderr(message: string): void;
}
