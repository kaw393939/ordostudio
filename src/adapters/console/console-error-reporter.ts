/**
 * Console Error Reporter
 *
 * Logs errors and messages via the application's structured logger.
 * This is the default adapter — no external monitoring service required.
 */

import type { ErrorReporterPort } from "../../core/ports/error-reporter";
import { getLogger } from "../../platform/logger";

export class ConsoleErrorReporter implements ErrorReporterPort {
  captureException(
    error: unknown,
    context?: Record<string, unknown>,
  ): void {
    const log = getLogger();
    log.error({ err: error, ...context }, "captured exception");
  }

  captureMessage(
    message: string,
    level: "info" | "warning" | "error",
    context?: Record<string, unknown>,
  ): void {
    const log = getLogger();
    const pinoLevel = level === "warning" ? "warn" : level;
    log[pinoLevel]({ ...context }, message);
  }
}
