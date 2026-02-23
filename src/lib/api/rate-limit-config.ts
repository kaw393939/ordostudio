/**
 * Rate limit configuration — defines per-category limits.
 *
 * Each category maps to a request budget within a sliding window.
 * Routes declare which category they belong to via withRateLimit().
 */

export interface RateLimitConfig {
  limit: number;
  windowMs: number;
}

export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  // Auth: tight limits (abuse target)
  "auth:login": { limit: 5, windowMs: 60_000 },
  "auth:register": { limit: 5, windowMs: 60_000 },
  "auth:password-reset": { limit: 3, windowMs: 60_000 },
  "auth:verify": { limit: 5, windowMs: 60_000 },

  // Admin writes: moderate limits
  "admin:write": { limit: 30, windowMs: 60_000 },

  // User writes: moderate limits
  "user:write": { limit: 20, windowMs: 60_000 },

  // Exports: strict (expensive operations)
  "export": { limit: 5, windowMs: 60_000 },

  // Webhooks: generous (Stripe sends bursts)
  "webhook": { limit: 100, windowMs: 60_000 },

  // Public mutations (newsletter subscribe, intake, etc.)
  "public:write": { limit: 10, windowMs: 60_000 },
} as const;
