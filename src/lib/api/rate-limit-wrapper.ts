/**
 * Rate limit wrapper — decorator to apply configurable rate limiting to route handlers.
 *
 * Usage:
 *   export const POST = withRequestLogging(withRateLimit("admin:write", _POST));
 */
import { consumeRateLimit } from "./rate-limit";
import { RATE_LIMITS } from "./rate-limit-config";
import { problem } from "./response";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RouteHandler = (...args: any[]) => Promise<Response | undefined>;

/**
 * Wrap a route handler with rate limiting.
 *
 * When the rate limit is exceeded, returns a 429 problem+json response
 * with standard rate limit headers.
 */
export function withRateLimit(
  category: string,
  handler: RouteHandler,
): RouteHandler {
  const config = RATE_LIMITS[category];
  if (!config) {
    throw new Error(`Unknown rate limit category: ${category}`);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return async (...args: any[]) => {
    if (process.env.NODE_ENV === "development") {
      return handler(...args);
    }

    const request: Request = args[0];
    const result = consumeRateLimit(
      request,
      category,
      config.limit,
      config.windowMs,
    );

    if (!result.allowed) {
      return problem(
        {
          type: "https://lms-219.dev/problems/rate-limited",
          title: "Too Many Requests",
          status: 429,
          detail: `Rate limit exceeded. Retry after ${result.retryAfterSeconds} seconds.`,
        },
        request,
        {
          headers: {
            "retry-after": String(result.retryAfterSeconds),
            "x-ratelimit-limit": String(config.limit),
            "x-ratelimit-remaining": "0",
            "cache-control": "no-store",
          },
        },
      );
    }

    return handler(...args);
  };
}
