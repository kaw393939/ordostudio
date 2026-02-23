/**
 * Application Logger — platform/logger.ts
 *
 * Structured JSON logging via Pino.
 * Reads LOG_LEVEL and LOG_FORMAT env vars.
 * Provides child loggers with requestId for request correlation.
 *
 * Usage:
 *   import { createLogger, getRequestLogger } from "@/platform/logger";
 *   const log = createLogger();
 *   const requestLog = getRequestLogger("some-uuid", log);
 */

import pino, { type Logger } from "pino";

export type AppLogger = Logger;

/**
 * Create a root application logger.
 *
 * - `LOG_LEVEL` env var sets the minimum level (default: "info")
 * - `LOG_FORMAT` env var: "pretty" → human-readable, anything else → JSON (default)
 */
export function createLogger(options?: {
  level?: string;
  name?: string;
}): AppLogger {
  const level =
    options?.level ?? process.env.LOG_LEVEL ?? "info";
  const format = (process.env.LOG_FORMAT ?? "json").toLowerCase();

  const transport: pino.TransportSingleOptions | undefined =
    format === "pretty"
      ? { target: "pino-pretty", options: { colorize: true } }
      : undefined;

  return pino({
    level,
    name: options?.name,
    ...(transport ? { transport } : {}),
  });
}

/**
 * Create a child logger scoped to a specific request.
 * Carries the requestId on every log line.
 */
export function getRequestLogger(
  requestId: string,
  base?: AppLogger,
): AppLogger {
  const parent = base ?? _defaultLogger();
  return parent.child({ requestId });
}

/* ── internal singleton ────────────────────────────── */

let _default: AppLogger | null = null;

function _defaultLogger(): AppLogger {
  if (!_default) {
    _default = createLogger();
  }
  return _default;
}

/* ── test helpers ──────────────────────────────────── */

let _override: AppLogger | null = null;

/** Override the default logger — typically used in tests. */
export function setLogger(logger: AppLogger): void {
  _override = logger;
  _default = logger;
}

/** Reset to default env-based logger. */
export function resetLogger(): void {
  _override = null;
  _default = null;
}

/** Get the current default logger (uses override if set). */
export function getLogger(): AppLogger {
  return _override ?? _defaultLogger();
}
