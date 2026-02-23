/**
 * Request Logging Wrapper
 *
 * Wraps Next.js route handlers to provide:
 * - Structured request/response logging via Pino
 * - Per-request requestId correlation
 * - Unhandled error capture via ErrorReporterPort
 * - Automatic 500 problem+json for escaping exceptions
 *
 * Usage:
 *   import { withRequestLogging } from "@/lib/api/request-logging";
 *   const _POST = async (request: Request) => { ... };
 *   export const POST = withRequestLogging(_POST);
 */

import { getRequestLogger } from "../../platform/logger";
import { resolveErrorReporter } from "../../platform/error-reporter";
import { problem } from "./response";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RouteHandler = (...args: any[]) => Promise<Response | undefined>;

/**
 * Wrap a route handler with structured logging and error capture.
 *
 * Logs on entry (method, path) and exit (status, duration).
 * Catches unhandled exceptions, logs them, reports to error reporter,
 * and returns a 500 problem+json response.
 *
 * Also logs a warning for any response with status >= 500 returned by
 * the handler's own error handling, so even "handled" server errors
 * appear in the structured logs.
 */
export function withRequestLogging<T extends RouteHandler>(handler: T): T {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (async (...args: any[]) => {
    const request: Request | undefined = args[0] instanceof Request ? args[0] : undefined;
    const requestId = crypto.randomUUID();
    const log = getRequestLogger(requestId);
    const start = Date.now();
    const method = request?.method ?? "UNKNOWN";
    const pathname = request ? new URL(request.url).pathname : "unknown";

    log.info(
      { method, path: pathname },
      "→ request",
    );

    try {
      const response = await handler(...args);
      const durationMs = Date.now() - start;

      if (!response) {
        log.warn({ durationMs }, "← handler returned undefined");
        return response;
      }

      if (response.status >= 500) {
        log.error(
          { status: response.status, durationMs },
          "← server error response",
        );
      } else {
        log.info(
          { status: response.status, durationMs },
          "← response",
        );
      }

      // Inject x-request-id into all responses for correlation
      if (!response.headers.has("x-request-id")) {
        response.headers.set("x-request-id", requestId);
      }

      return response;
    } catch (err) {
      const durationMs = Date.now() - start;
      log.error(
        { err, durationMs },
        "✗ unhandled error",
      );

      resolveErrorReporter().captureException(err, {
        requestId,
        method,
        url: request?.url,
      });

      return problem(
        {
          type: "https://lms-219.dev/problems/internal",
          title: "Internal Server Error",
          status: 500,
          detail: "An unexpected error occurred.",
        },
        request,
        { requestId },
      );
    }
  }) as T;
}
