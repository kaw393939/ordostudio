# Sprint PRD-04 — Security Headers + Next.js Middleware

## Severity: HIGH

## Goal
Add a Next.js `middleware.ts` that sets security headers on every response and provides defense-in-depth route protection for admin and account pages. Also configure CORS for the API.

## Why This Is High Priority
There is **no `middleware.ts`** in the project. No CSP, no X-Frame-Options, no HSTS, no Referrer-Policy headers are set on any response. The `next.config.ts` is empty. Auth is enforced per-route via `getSessionUserFromRequest()` — functional but a single missed check in any new route creates an unprotected admin endpoint.

## Current State (Evidence)

| What exists | Where | Problem |
|-------------|-------|---------|
| No middleware.ts | Confirmed by file search | No security headers, no route-level auth guard |
| Empty next.config.ts | `next.config.ts`: `const nextConfig: NextConfig = {}` | No headers configuration |
| Per-route auth | Every protected route calls `getSessionUserFromRequest(request)` | Single-point-of-failure pattern |
| CSRF protection | `isSameOriginMutation()` in `src/lib/api/auth.ts` line 225 | Only mutation routes, no read protection |
| Session cookie | `lms_session`, HttpOnly, SameSite=Lax, Secure in prod | Solid cookie config |
| No CORS | Zero CORS headers configured | Browser may block cross-origin API calls |

## Scope

### 1. Security Headers Middleware (`src/middleware.ts`)

Apply on every response:
```
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
X-DNS-Prefetch-Control: off
```

### 2. Content Security Policy
Build a CSP header appropriate for Next.js:
```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval';   // Next.js requires these in dev
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  font-src 'self';
  connect-src 'self' https://api.postmarkapp.com https://api.stripe.com;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
```
- Tighter in production (remove `unsafe-eval`)
- CSP report-uri can be added later when logging is in place (PRD-03)

### 3. CORS Configuration
For API routes (`/api/*`):
- `Access-Control-Allow-Origin`: configured via `CORS_ALLOWED_ORIGINS` env var (default: same origin)
- `Access-Control-Allow-Methods`: `GET, POST, PATCH, PUT, DELETE, OPTIONS`
- `Access-Control-Allow-Headers`: `Content-Type, Authorization, X-Requested-With`
- `Access-Control-Allow-Credentials`: `true` (needed for cookie-based auth)
- Handle `OPTIONS` preflight requests

### 4. Route-Level Auth Guard (defense-in-depth)
Add middleware matchers for protected route groups:
```ts
// Admin routes: require session cookie to exist (detailed auth still in route handlers)
if (pathname.startsWith("/admin") || pathname.startsWith("/api/v1/admin")) {
  if (!request.cookies.has("lms_session")) {
    return pathname.startsWith("/api/") 
      ? NextResponse.json({ type: "unauthorized", title: "Unauthorized", status: 401 }, { status: 401 })
      : NextResponse.redirect(new URL("/login", request.url));
  }
}

// Account routes: same pattern
if (pathname.startsWith("/account") || pathname.startsWith("/api/v1/account")) {
  if (!request.cookies.has("lms_session")) {
    return pathname.startsWith("/api/")
      ? NextResponse.json({ ... }, { status: 401 })
      : NextResponse.redirect(new URL("/login", request.url));
  }
}
```

Note: This is **defense-in-depth only** — it checks cookie presence, not validity. Route handlers still do full session validation. This catches the "forgot to add auth check" case.

### 5. Request Body Size Limit
Add enforcement in middleware for POST/PATCH/PUT requests:
```ts
const MAX_BODY_SIZE = 1_048_576; // 1 MB
const contentLength = parseInt(request.headers.get("content-length") ?? "0");
if (contentLength > MAX_BODY_SIZE) {
  return NextResponse.json(
    { type: "payload-too-large", title: "Payload Too Large", status: 413 },
    { status: 413 }
  );
}
```

## Non-Goals
- CSP nonce-based script loading (requires RSC streaming changes)
- WAF / DDoS protection (infrastructure layer)
- Rate limiting in middleware (stays in route handlers per PRD-07)
- Full RBAC middleware (route handlers own detailed permission checks)

## TDD Process

### Red Phase
1. **Security headers tests** (`src/__tests__/middleware-security-headers.test.ts`):
   - GET / → response headers include all 6 security headers
   - GET /api/v1/events → response headers include all 6
   - Headers have correct values
   - CSP differs between `NODE_ENV=development` and `NODE_ENV=production`

2. **CORS tests**:
   - OPTIONS /api/v1/events → 204 with CORS headers
   - GET /api/v1/events with Origin header → response includes Access-Control-Allow-Origin
   - Non-allowed origin → no CORS header (or origin mismatch)
   - Credentials header present

3. **Route guard tests**:
   - GET /admin without session cookie → redirect to /login
   - GET /admin with session cookie → passes through (200)
   - GET /api/v1/admin/events without session cookie → 401
   - GET /account without session cookie → redirect to /login
   - GET /events (public) without session cookie → passes through
   - GET /api/v1/events (public) without session cookie → passes through

4. **Body size limit tests**:
   - POST /api/v1/events with Content-Length > 1MB → 413
   - POST /api/v1/events with Content-Length within limit → passes through

### Green Phase — Implement middleware.ts
### Refactor Phase — Extract header builders, configure via env vars

## E2E Verification Tests

### Test: "all responses include security headers"
```
1. GET / (public home page)
2. Assert: X-Content-Type-Options: nosniff
3. Assert: X-Frame-Options: DENY
4. Assert: Referrer-Policy: strict-origin-when-cross-origin
5. Assert: Content-Security-Policy contains "default-src 'self'"
```

### Test: "admin pages redirect unauthenticated users to login"
```
1. GET /admin (no session cookie)
2. Assert: 302/307 redirect to /login
3. Login as admin → get session cookie
4. GET /admin (with session cookie)
5. Assert: 200
```

### Test: "CORS preflight returns correct headers"
```
1. OPTIONS /api/v1/events with Origin header
2. Assert: 204
3. Assert: Access-Control-Allow-Methods includes GET, POST
4. Assert: Access-Control-Allow-Credentials: true
```

### Test: "oversized request body rejected before reaching handler"
```
1. POST /api/v1/events with Content-Length: 2000000
2. Assert: 413 with problem+json body
```

## Acceptance Criteria
- [ ] `src/middleware.ts` created and operational
- [ ] 6 security headers on every response
- [ ] CSP appropriate for Next.js (dev vs prod variants)
- [ ] CORS configured for API routes via env var
- [ ] Admin routes require session cookie (defense-in-depth)
- [ ] Account routes require session cookie
- [ ] Request body size limit enforced
- [ ] Public routes unaffected
- [ ] All existing e2e tests still pass
- [ ] `npm test`, `npm run lint`, `npm run build` all pass

## New Env Vars
| Variable | Default | Purpose |
|----------|---------|---------|
| `CORS_ALLOWED_ORIGINS` | `""` (same-origin only) | Comma-separated allowed origins |
| `MAX_REQUEST_BODY_BYTES` | `1048576` | Request body size limit |

## End-of-Sprint Verification
```bash
npm test
npm run lint
npm run build
```
