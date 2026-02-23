/**
 * Error Reporter Platform Resolver
 *
 * Resolves the ErrorReporterPort based on environment configuration.
 * Follows the same resolver + test-override pattern as platform/email.ts.
 */

import type { ErrorReporterPort } from "../core/ports/error-reporter";
import { ConsoleErrorReporter } from "../adapters/console/console-error-reporter";

/* ── mutable singleton with test seam ─────────────── */

let _override: ErrorReporterPort | null = null;
let _instance: ErrorReporterPort | null = null;

/**
 * Resolve the error reporter.
 *
 * - If SENTRY_DSN is set → would use SentryErrorReporter (lazy-loaded to avoid
 *   pulling the SDK into builds that don't need it)
 * - Otherwise → ConsoleErrorReporter (logs via Pino)
 */
export function resolveErrorReporter(): ErrorReporterPort {
  if (_override) return _override;

  if (!_instance) {
    if (process.env.SENTRY_DSN) {
      // Dynamic import to avoid hard dependency on @sentry/node
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { SentryErrorReporter } = require("../adapters/sentry/sentry-error-reporter");
      _instance = new SentryErrorReporter() as ErrorReporterPort;
    } else {
      _instance = new ConsoleErrorReporter();
    }
  }

  return _instance;
}

/** Override the error reporter — typically used in tests. */
export function setErrorReporter(reporter: ErrorReporterPort): void {
  _override = reporter;
}

/** Reset to default env-based resolution. */
export function resetErrorReporter(): void {
  _override = null;
  _instance = null;
}
