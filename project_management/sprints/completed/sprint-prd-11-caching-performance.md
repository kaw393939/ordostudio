# Sprint PRD-11 — Caching + Performance Optimization

## Severity: MEDIUM

## Goal
Add server-side caching for expensive database queries, optimize Next.js rendering with ISR where appropriate, and establish performance baselines with measurable benchmarks.

## Why This Matters
Every API request re-executes SQLite queries with zero memoization. While SQLite is fast for single-instance deployments, as data grows, queries for event lists, offer catalogs, and public pages will increasingly impact response times. The current HTTP `Cache-Control` headers provide some browser caching, but the server does all the work on every request.

## Current State (Evidence)

| What exists | Where |
|-------------|-------|
| HTTP Cache-Control headers | Public reads: `private, max-age=30, stale-while-revalidate=60` |
| `no-store` on protected routes | Auth, admin, account, mutations |
| No `unstable_cache` usage | Zero references in codebase |
| No `revalidatePath` / `revalidateTag` | Zero references |
| No ISR configuration | No `revalidate` exports in page.tsx files |
| No Redis or in-memory cache | No caching layer |
| Lighthouse CI workflow exists | `.github/workflows/lighthouse-release-gate.yml` |
| SQLite with busy timeout | `APPCTL_DB_BUSY_TIMEOUT_MS` default 5000ms |

## Scope

### 1. Application Cache Layer (`platform/cache.ts`)
Simple TTL-based in-memory cache for server-side query results:
```ts
export interface CachePort {
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T, ttlMs: number): void;
  invalidate(key: string): void;
  invalidatePattern(pattern: string): void;
  clear(): void;
}

export class InMemoryCache implements CachePort { ... }
```

- LRU eviction when `MAX_CACHE_ENTRIES` exceeded (default: 1000)
- TTL-based expiry
- Pattern-based invalidation (e.g., `events:*` clears all event cache entries)
- Thread-safe for single-process Node.js

### 2. Cache Keys and TTLs
| Cache Key Pattern | TTL | Invalidated By |
|-------------------|-----|----------------|
| `events:list:${status}:${page}` | 30s | Event create/update/publish/cancel |
| `events:detail:${slug}` | 60s | Event update |
| `offers:list` | 5min | Offer create/update |
| `offers:detail:${slug}` | 5min | Offer update |
| `apprentices:list` | 2min | Profile create/update |
| `apprentices:detail:${handle}` | 2min | Profile update |

### 3. Cache Invalidation on Mutations
Wrap mutation handlers to invalidate relevant cache keys:
```ts
// After event update:
cache.invalidatePattern("events:*");

// After offer update:
cache.invalidatePattern("offers:*");
```

### 4. Next.js ISR for Public Pages
Add `revalidate` to public pages that don't need real-time data:
```ts
// src/app/(public)/events/page.tsx
export const revalidate = 30; // Revalidate every 30 seconds

// src/app/(public)/services/page.tsx
export const revalidate = 300; // Revalidate every 5 minutes

// src/app/(public)/apprentices/page.tsx
export const revalidate = 120; // Revalidate every 2 minutes
```

### 5. Database Query Optimization
- Add indexes for common query patterns not yet covered
- Review slow queries with `EXPLAIN QUERY PLAN`
- Add composite indexes for filtered + sorted queries:
```sql
CREATE INDEX IF NOT EXISTS idx_events_status_start ON events(status, start_datetime);
CREATE INDEX IF NOT EXISTS idx_registrations_event_status ON event_registrations(event_slug, status);
```

### 6. Response Compression
Verify Next.js compression is enabled (default in production). Add explicit compression config if needed.

### 7. Performance Benchmarks
Create a benchmark test that measures response times:
```ts
// src/__tests__/performance-benchmarks.test.ts
describe("API response time benchmarks", () => {
  it("GET /api/v1/events responds under 100ms", async () => {
    const start = performance.now();
    const res = await GET(new Request("http://localhost/api/v1/events"));
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(100);
  });
});
```

## Non-Goals
- Redis integration (in-memory cache sufficient for SQLite single-instance)
- CDN configuration (infrastructure concern)
- Full query profiling / APM
- Edge caching / Vercel edge runtime
- Image optimization CDN (separate from PRD-09)

## TDD Process

### Red Phase
1. **Cache tests** (`platform/__tests__/cache.test.ts`):
   - `set()` + `get()` → returns cached value
   - Expired TTL → returns undefined
   - `invalidate(key)` → removes specific key
   - `invalidatePattern("events:*")` → removes matching keys
   - `clear()` → removes all entries
   - LRU eviction when max entries exceeded

2. **Cache integration tests**:
   - GET /api/v1/events → response cached
   - POST /api/v1/events (create) → event cache invalidated
   - Subsequent GET → fresh data

3. **Performance benchmark tests**:
   - Event list API < 100ms
   - Event detail API < 50ms
   - Offer list API < 50ms
   - Auth login API < 200ms (includes argon2)

4. **ISR tests**:
   - Public event page has `revalidate` export
   - Offer page has `revalidate` export

### Green Phase — Implement cache + ISR + indexes
### Refactor Phase — Tune TTLs, verify benchmarks

## E2E Verification Tests

### Test: "cached event list is faster on second request"
```
1. GET /api/v1/events (cold)
2. Record response time T1
3. GET /api/v1/events (warm)
4. Record response time T2
5. Assert: T2 < T1 (cached response faster)
6. Assert: both return identical data
```

### Test: "cache invalidated after mutation"
```
1. GET /api/v1/events → returns N events
2. POST /api/v1/events (create new)
3. GET /api/v1/events → returns N+1 events (cache invalidated)
```

### Test: "API response times within benchmarks"
```
Parameterized test for 5 key endpoints:
1. Warm up with 1 request
2. Measure 10 requests
3. Assert: p95 response time < threshold
   - Events list: < 100ms
   - Event detail: < 50ms
   - Offers list: < 50ms
   - Public home: < 200ms
```

### Test: "public pages have ISR revalidation configured"
```
1. Import events/page.tsx module
2. Assert: export revalidate === 30
3. Import offers page
4. Assert: export revalidate === 300
```

## Acceptance Criteria
- [ ] In-memory `CachePort` with TTL and LRU eviction
- [ ] Cache keys defined for 6+ read-heavy endpoints
- [ ] Cache invalidation on all mutation paths
- [ ] ISR configured for 3+ public pages
- [ ] Database indexes added for common query patterns
- [ ] Performance benchmark test suite (5+ endpoints)
- [ ] All benchmarks pass with defined thresholds
- [ ] No stale data served after mutations
- [ ] All existing e2e tests pass
- [ ] `npm test`, `npm run lint`, `npm run build` all pass

## New Env Vars
| Variable | Default | Purpose |
|----------|---------|---------|
| `CACHE_MAX_ENTRIES` | `1000` | Max in-memory cache entries |
| `CACHE_ENABLED` | `"true"` | Disable cache for debugging |

## End-of-Sprint Verification
```bash
npm test
npm run lint
npm run build
```
