/**
 * Platform-layer shared types.
 *
 * These types are the canonical definitions for application configuration
 * and runtime environment. They are importable by every layer (core, adapters,
 * delivery) without violating the dependency rule.
 */

export type RuntimeEnv = "local" | "staging" | "prod";

export interface DbConfig {
  mode: "sqlite";
  file: string;
  busyTimeoutMs: number;
}

export interface SecurityConfig {
  requireTokenInStaging: boolean;
  requireTokenInProd: boolean;
  dangerousOpsRequireExplicitProd: boolean;
}

export interface AuditConfig {
  strict: boolean;
}

export interface OutputConfig {
  defaultFormat: "text" | "json";
}

export interface AppConfig {
  env: RuntimeEnv;
  db: DbConfig;
  security: SecurityConfig;
  audit: AuditConfig;
  output: OutputConfig;
}
