# Sprint PRD-08 — Session Hardening + Auth Tightening

## Severity: MEDIUM

## Goal
Harden the session management system: add sliding expiry (extend on activity), revoke all sessions on password change, add session listing and selective revocation in account settings, and add a global session revocation ("sign out everywhere") capability.

## Why This Matters
Sessions are currently fixed 7-day expiry with no renewal. A password change does **not** revoke existing sessions — a stolen session token remains valid for up to 7 days after the password is changed. Users cannot see or manage their active sessions. There's no "sign out everywhere" functionality.

## Current State (Evidence)

| What exists | Where |
|-------------|-------|
| Session creation with 7-day fixed expiry | `src/lib/api/auth.ts` line 40: `SESSION_DAYS = 7` |
| Session cookie: HttpOnly, SameSite=Lax, Secure in prod | `src/lib/api/auth.ts` lines 203-214 |
| Session token hashed with SHA-256 | `src/lib/api/auth.ts` line 167 |
| `api_sessions` table with `expires_at`, `revoked_at`, `last_seen_at` | `src/adapters/sqlite/auth-schema.ts` |
| `last_seen_at` column exists but never updated | No code writes to `last_seen_at` |
| Logout revokes single session | `src/app/api/v1/auth/logout/route.ts` |
| Password reset does NOT revoke sessions | `confirmPasswordReset()` at `src/lib/api/auth.ts` line 600 |
| No session list endpoint | No route exists |
| No "sign out everywhere" | No revoke-all function |
| No session metadata (device, IP, user-agent) | Only `user_id`, `token_hash`, timestamps |

## Scope

### 1. Sliding Session Expiry
Update `getSessionUserFromRequest()` to extend the session on activity:
```ts
// After successful session lookup:
const now = new Date().toISOString();
db.prepare(`
  UPDATE api_sessions 
  SET last_seen_at = ?, expires_at = ? 
  WHERE id = ?
`).run(now, addDays(now, SESSION_DAYS).toISOString(), session.id);
```

Also update the session cookie's `Max-Age` in the response to match.

Throttle updates to avoid DB write on every request: only update if `last_seen_at` is > 1 hour old.

### 2. Session Metadata
Add session metadata at creation time:
```sql
ALTER TABLE api_sessions ADD COLUMN ip_address TEXT;
ALTER TABLE api_sessions ADD COLUMN user_agent TEXT;
```

Populate on login:
```ts
const ip = request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? "unknown";
const userAgent = request.headers.get("user-agent") ?? "unknown";
```

### 3. Revoke All Sessions on Password Change
In `confirmPasswordReset()`:
```ts
db.prepare(`
  UPDATE api_sessions SET revoked_at = ? 
  WHERE user_id = ? AND revoked_at IS NULL
`).run(now, userId);
```

### 4. Session List Endpoint
`GET /api/v1/account/sessions` — returns all active sessions for the current user:
```json
{
  "sessions": [
    {
      "id": "sess-abc",
      "created_at": "2026-02-21T10:00:00Z",
      "last_seen_at": "2026-02-21T14:30:00Z",
      "ip_address": "192.168.1.1",
      "user_agent": "Mozilla/5.0 ...",
      "is_current": true
    }
  ],
  "_links": { "self": { "href": "/api/v1/account/sessions" } }
}
```

### 5. Revoke Specific Session
`DELETE /api/v1/account/sessions/:sessionId` — revokes a specific session.
- Cannot revoke your own current session (use logout instead)
- Returns 204 on success

### 6. Sign Out Everywhere
`POST /api/v1/account/sessions/revoke-all` — revokes all sessions except current:
```ts
db.prepare(`
  UPDATE api_sessions SET revoked_at = ?
  WHERE user_id = ? AND id != ? AND revoked_at IS NULL
`).run(now, userId, currentSessionId);
```

### 7. Absolute Session Lifetime
Even with sliding expiry, add an absolute maximum lifetime:
```ts
const ABSOLUTE_MAX_DAYS = 30;
```
Sessions older than 30 days from creation cannot be renewed regardless of activity.

## Non-Goals
- Multi-factor authentication (separate feature)
- Session fingerprinting / device binding
- Concurrent session limits
- Remember-me / long-lived sessions
- Session encryption at rest (hashing is sufficient)

## TDD Process

### Red Phase
1. **Sliding expiry tests** (`src/app/__tests__/e2e-session-sliding.test.ts`):
   - Login → session has initial `expires_at`
   - Make API call with session → `expires_at` extended
   - Make call within 1 hour → `expires_at` NOT updated (throttled)
   - Make call after 1 hour → `expires_at` updated
   - Session older than `ABSOLUTE_MAX_DAYS` → rejected even if recently active

2. **Password change session revocation tests**:
   - Login on "device A" and "device B" (two sessions)
   - Reset password
   - Device A session → revoked
   - Device B session → revoked
   - New login required

3. **Session list tests**:
   - Login → GET /api/v1/account/sessions → returns 1 session
   - Login twice → returns 2 sessions
   - Current session marked with `is_current: true`
   - Session includes IP and user-agent

4. **Session revocation tests**:
   - Login on device A and B
   - Revoke device B's session via DELETE
   - Device B's API calls → 401
   - Device A still works

5. **Sign out everywhere tests**:
   - Login on devices A, B, C
   - POST /api/v1/account/sessions/revoke-all
   - B and C → 401, A still works

6. **Session metadata tests**:
   - Login with specific User-Agent and IP headers
   - GET /api/v1/account/sessions → metadata present

### Green Phase — Implement all features
### Refactor Phase — Extract session management into dedicated module

## E2E Verification Tests

### Test: "password reset invalidates all active sessions"
```
1. Register user and login (session A)
2. Login again in separate request (session B)
3. Both sessions can access /api/v1/me → 200
4. Request password reset → confirm with new password
5. Session A: GET /api/v1/me → 401
6. Session B: GET /api/v1/me → 401
7. Login with new password → new session works
```

### Test: "sign out everywhere keeps current session active"
```
1. Login (session A) and login again (session B)
2. Using session A: POST /api/v1/account/sessions/revoke-all
3. Session A: GET /api/v1/me → 200 (still works)
4. Session B: GET /api/v1/me → 401 (revoked)
```

### Test: "session expires after absolute maximum lifetime"
```
1. Login
2. Simulate 31 days passing (manipulate DB timestamps)
3. Make API call with session → 401
4. Even though last_seen_at was recent
```

### Test: "session list shows accurate metadata"
```
1. Login with User-Agent: "TestBrowser/1.0" and X-Forwarded-For: "10.0.0.1"
2. GET /api/v1/account/sessions
3. Assert: session[0].user_agent === "TestBrowser/1.0"
4. Assert: session[0].ip_address === "10.0.0.1"
5. Assert: session[0].is_current === true
```

## Acceptance Criteria
- [ ] Sliding session expiry (extend on activity, throttled to 1hr)
- [ ] Absolute maximum session lifetime (30 days)
- [ ] `last_seen_at` updated on session use
- [ ] Session metadata stored (IP, user-agent)
- [ ] Password change revokes all sessions
- [ ] `GET /api/v1/account/sessions` — list active sessions
- [ ] `DELETE /api/v1/account/sessions/:id` — revoke specific session
- [ ] `POST /api/v1/account/sessions/revoke-all` — sign out everywhere
- [ ] All existing auth e2e tests pass
- [ ] `npm test`, `npm run lint`, `npm run build` all pass

## End-of-Sprint Verification
```bash
npm test
npm run lint
npm run build
```
