/**
 * Cache Key Configuration
 *
 * Defines cache key patterns and TTLs for server-side query result caching.
 * Keys follow the pattern: `domain:operation:params...`
 */

/** TTL values in milliseconds */
export const CACHE_TTLS = {
  /** Event list queries — 30 seconds */
  EVENTS_LIST: 30_000,
  /** Event detail by slug — 60 seconds */
  EVENTS_DETAIL: 60_000,
  /** Offer list queries — 5 minutes */
  OFFERS_LIST: 300_000,
  /** Offer detail by slug — 5 minutes */
  OFFERS_DETAIL: 300_000,
  /** Apprentice list — 2 minutes */
  APPRENTICES_LIST: 120_000,
  /** Apprentice detail by handle — 2 minutes */
  APPRENTICES_DETAIL: 120_000,
  /** Service catalog — 10 minutes (rarely changes) */
  SERVICES: 600_000,
} as const;

/** Build a cache key for event list queries. */
export const eventListKey = (params: {
  status?: string;
  q?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}): string => {
  const parts = [
    params.status ?? "all",
    params.q ?? "",
    params.from ?? "",
    params.to ?? "",
    String(params.limit ?? 20),
    String(params.offset ?? 0),
  ];
  return `events:list:${parts.join(":")}`;
};

/** Build a cache key for event detail. */
export const eventDetailKey = (slug: string): string => `events:detail:${slug}`;

/** Build a cache key for offer list queries. */
export const offerListKey = (params?: { status?: string }): string =>
  `offers:list:${params?.status ?? "all"}`;

/** Build a cache key for offer detail. */
export const offerDetailKey = (slug: string): string => `offers:detail:${slug}`;

/** Build a cache key for apprentice list. */
export const apprenticeListKey = (): string => "apprentices:list";

/** Build a cache key for apprentice detail. */
export const apprenticeDetailKey = (handle: string): string => `apprentices:detail:${handle}`;

/** Build a cache key for service catalog. */
export const serviceListKey = (): string => "services:list";

/**
 * Invalidation patterns for mutations.
 * Maps mutation type → cache patterns to invalidate.
 */
export const INVALIDATION_MAP: Record<string, string[]> = {
  "event:create": ["events:*"],
  "event:update": ["events:*"],
  "event:publish": ["events:*"],
  "event:cancel": ["events:*"],
  "event:delete": ["events:*"],
  "offer:create": ["offers:*"],
  "offer:update": ["offers:*"],
  "offer:delete": ["offers:*"],
  "apprentice:create": ["apprentices:*"],
  "apprentice:update": ["apprentices:*"],
  "service:update": ["services:*"],
};
