/**
 * Error Reporter Port
 *
 * Abstraction over error/exception reporting services (Sentry, Datadog, etc.).
 * Lives in core/ports so use-cases and infrastructure can report errors
 * without coupling to a specific monitoring vendor.
 */

/* ── port interface ────────────────────────────────── */

export interface ErrorReporterPort {
  /** Capture an exception with optional context metadata. */
  captureException(
    error: unknown,
    context?: Record<string, unknown>,
  ): void;

  /** Capture a message-level event (e.g., warning about degraded state). */
  captureMessage(
    message: string,
    level: "info" | "warning" | "error",
    context?: Record<string, unknown>,
  ): void;
}
