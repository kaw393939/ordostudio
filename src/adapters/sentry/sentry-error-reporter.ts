/**
 * Sentry Error Reporter — Stub Adapter
 *
 * Placeholder that delegates to ConsoleErrorReporter.
 * When a SENTRY_DSN env var is provided in the future, this adapter
 * will be wired to the real Sentry SDK. For now it establishes the
 * seam without adding the dependency.
 */

import type { ErrorReporterPort } from "../../core/ports/error-reporter";
import { ConsoleErrorReporter } from "../console/console-error-reporter";

export class SentryErrorReporter implements ErrorReporterPort {
  private readonly fallback = new ConsoleErrorReporter();

  captureException(
    error: unknown,
    context?: Record<string, unknown>,
  ): void {
    // TODO: forward to Sentry SDK when SENTRY_DSN is configured
    this.fallback.captureException(error, context);
  }

  captureMessage(
    message: string,
    level: "info" | "warning" | "error",
    context?: Record<string, unknown>,
  ): void {
    // TODO: forward to Sentry SDK when SENTRY_DSN is configured
    this.fallback.captureMessage(message, level, context);
  }
}
