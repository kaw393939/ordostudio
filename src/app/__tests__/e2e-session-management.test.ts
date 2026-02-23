import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { GET as getMe } from "../api/v1/me/route";
import { POST as postLogin } from "../api/v1/auth/login/route";
import { POST as postRegister } from "../api/v1/auth/register/route";
import { POST as postResetRequest } from "../api/v1/auth/password-reset/request/route";
import { POST as postResetConfirm } from "../api/v1/auth/password-reset/confirm/route";
import { GET as getSessions } from "../api/v1/account/sessions/route";
import { DELETE as deleteSession } from "../api/v1/account/sessions/[sessionId]/route";
import { POST as postRevokeAll } from "../api/v1/account/sessions/revoke-all/route";
import {
  cleanupStandardE2EFixtures,
  setupStandardE2EFixture,
  type StandardE2EFixture,
} from "./helpers/e2e-fixtures";

let fixture: StandardE2EFixture;

const loginAs = async (email: string, password = "Password123!", ip = "10.0.0.1", ua = "TestBrowser/1.0") => {
  const response = await postLogin(
    new Request("http://localhost:3000/api/v1/auth/login", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "http://localhost:3000",
        "x-forwarded-for": ip,
        "user-agent": ua,
      },
      body: JSON.stringify({ email, password }),
    }),
  );
  const cookie = (response.headers.get("set-cookie") ?? "").split(";")[0];
  return { response, cookie };
};

const meRequest = (cookie: string) =>
  getMe(
    new Request("http://localhost:3000/api/v1/me", {
      method: "GET",
      headers: { cookie },
    }),
  );

const sessionsRequest = (cookie: string) =>
  getSessions(
    new Request("http://localhost:3000/api/v1/account/sessions", {
      method: "GET",
      headers: { cookie },
    }),
  );

describe("e2e session management (PRD-08)", () => {
  beforeEach(async () => {
    fixture = await setupStandardE2EFixture();
    process.env.APPCTL_ENV = "local";
  });

  afterEach(async () => {
    await cleanupStandardE2EFixtures();
  });

  // ── Session Metadata ──────────────────────────────────────────────────

  it("stores and returns session metadata (IP, user-agent)", async () => {
    await postRegister(
      new Request("http://localhost:3000/api/v1/auth/register", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({ email: "meta-user@example.com", password: "Password123!" }),
      }),
    );

    const { cookie } = await loginAs("meta-user@example.com", "Password123!", "10.0.0.1", "TestBrowser/1.0");

    const sessResp = await sessionsRequest(cookie);
    expect(sessResp.status).toBe(200);

    const body = await sessResp.json();
    expect(body.sessions.length).toBeGreaterThanOrEqual(1);

    const current = body.sessions.find((s: { is_current: boolean }) => s.is_current);
    expect(current).toBeTruthy();
    expect(current.ip_address).toBe("10.0.0.1");
    expect(current.user_agent).toBe("TestBrowser/1.0");
    expect(current.is_current).toBe(true);
  });

  // ── Session List ──────────────────────────────────────────────────────

  it("lists active sessions for current user", async () => {
    await postRegister(
      new Request("http://localhost:3000/api/v1/auth/register", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({ email: "list-user@example.com", password: "Password123!" }),
      }),
    );

    const { cookie: cookieA } = await loginAs("list-user@example.com", "Password123!", "10.0.0.1", "DeviceA");
    await loginAs("list-user@example.com", "Password123!", "10.0.0.2", "DeviceB");

    const sessResp = await sessionsRequest(cookieA);
    const body = await sessResp.json();

    expect(body.sessions.length).toBe(2);
    expect(body._links.self.href).toBe("/api/v1/account/sessions");
  });

  it("returns 401 for unauthenticated session list request", async () => {
    const resp = await sessionsRequest("invalid_cookie=123");
    expect(resp.status).toBe(401);
  });

  // ── Revoke Specific Session ───────────────────────────────────────────

  it("revokes a specific other session", async () => {
    await postRegister(
      new Request("http://localhost:3000/api/v1/auth/register", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({ email: "revoke-user@example.com", password: "Password123!" }),
      }),
    );

    const { cookie: cookieA } = await loginAs("revoke-user@example.com", "Password123!", "10.0.0.1", "DeviceA");
    const { cookie: cookieB } = await loginAs("revoke-user@example.com", "Password123!", "10.0.0.2", "DeviceB");

    // Both sessions work
    const meA = await meRequest(cookieA);
    const meB = await meRequest(cookieB);
    expect(meA.status).toBe(200);
    expect(meB.status).toBe(200);

    // Get session list from A to find B's session ID
    const sessResp = await sessionsRequest(cookieA);
    const body = await sessResp.json();
    const otherSession = body.sessions.find((s: { is_current: boolean }) => !s.is_current);
    expect(otherSession).toBeTruthy();

    // Revoke B's session
    const delResp = await deleteSession(
      new Request(`http://localhost:3000/api/v1/account/sessions/${otherSession.id}`, {
        method: "DELETE",
        headers: {
          origin: "http://localhost:3000",
          cookie: cookieA,
        },
      }),
      { params: Promise.resolve({ sessionId: otherSession.id }) },
    );
    expect(delResp.status).toBe(204);

    // A still works, B is revoked
    expect((await meRequest(cookieA)).status).toBe(200);
    expect((await meRequest(cookieB)).status).toBe(401);
  });

  it("prevents revoking your own current session", async () => {
    await postRegister(
      new Request("http://localhost:3000/api/v1/auth/register", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({ email: "self-revoke@example.com", password: "Password123!" }),
      }),
    );

    const { cookie } = await loginAs("self-revoke@example.com");

    // Get session list to find our own session ID
    const sessResp = await sessionsRequest(cookie);
    const body = await sessResp.json();
    const currentSession = body.sessions.find((s: { is_current: boolean }) => s.is_current);

    const delResp = await deleteSession(
      new Request(`http://localhost:3000/api/v1/account/sessions/${currentSession.id}`, {
        method: "DELETE",
        headers: {
          origin: "http://localhost:3000",
          cookie,
        },
      }),
      { params: Promise.resolve({ sessionId: currentSession.id }) },
    );
    expect(delResp.status).toBe(409);
  });

  // ── Sign Out Everywhere ───────────────────────────────────────────────

  it("sign out everywhere keeps current session active and revokes others", async () => {
    await postRegister(
      new Request("http://localhost:3000/api/v1/auth/register", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({ email: "everywhere-user@example.com", password: "Password123!" }),
      }),
    );

    const { cookie: cookieA } = await loginAs("everywhere-user@example.com", "Password123!", "10.0.0.1", "DeviceA");
    const { cookie: cookieB } = await loginAs("everywhere-user@example.com", "Password123!", "10.0.0.2", "DeviceB");
    const { cookie: cookieC } = await loginAs("everywhere-user@example.com", "Password123!", "10.0.0.3", "DeviceC");

    // All sessions work initially
    expect((await meRequest(cookieA)).status).toBe(200);
    expect((await meRequest(cookieB)).status).toBe(200);
    expect((await meRequest(cookieC)).status).toBe(200);

    // Revoke all from A
    const revokeResp = await postRevokeAll(
      new Request("http://localhost:3000/api/v1/account/sessions/revoke-all", {
        method: "POST",
        headers: {
          origin: "http://localhost:3000",
          cookie: cookieA,
        },
      }),
    );
    expect(revokeResp.status).toBe(200);
    const revokeBody = await revokeResp.json();
    expect(revokeBody.revoked_count).toBe(2);

    // A still works, B and C are revoked
    expect((await meRequest(cookieA)).status).toBe(200);
    expect((await meRequest(cookieB)).status).toBe(401);
    expect((await meRequest(cookieC)).status).toBe(401);
  });

  // ── Password Reset Revokes All Sessions ───────────────────────────────

  it("password reset invalidates all active sessions", async () => {
    await postRegister(
      new Request("http://localhost:3000/api/v1/auth/register", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({ email: "pwreset-user@example.com", password: "Password123!" }),
      }),
    );

    const { cookie: cookieA } = await loginAs("pwreset-user@example.com");
    const { cookie: cookieB } = await loginAs("pwreset-user@example.com");

    // Both sessions work
    expect((await meRequest(cookieA)).status).toBe(200);
    expect((await meRequest(cookieB)).status).toBe(200);

    // Request password reset
    const resetReq = await postResetRequest(
      new Request("http://localhost:3000/api/v1/auth/password-reset/request", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
          "x-forwarded-for": "10.0.0.99",
        },
        body: JSON.stringify({ email: "pwreset-user@example.com" }),
      }),
    );
    const resetBody = await resetReq.json();

    // Confirm password reset
    await postResetConfirm(
      new Request("http://localhost:3000/api/v1/auth/password-reset/confirm", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({
          token: resetBody.reset_token,
          password: "NewPassword123!",
        }),
      }),
    );

    // Both sessions should now be revoked
    expect((await meRequest(cookieA)).status).toBe(401);
    expect((await meRequest(cookieB)).status).toBe(401);

    // Login with new password works
    const { cookie: newCookie } = await loginAs("pwreset-user@example.com", "NewPassword123!");
    expect((await meRequest(newCookie)).status).toBe(200);
  });

  // ── Sliding Session Expiry ────────────────────────────────────────────

  it("extends session expiry on activity (sliding expiry)", async () => {
    await postRegister(
      new Request("http://localhost:3000/api/v1/auth/register", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({ email: "sliding-user@example.com", password: "Password123!" }),
      }),
    );

    const { cookie } = await loginAs("sliding-user@example.com");

    // Get initial session to check expires_at
    const db = new Database(fixture.dbPath);
    const sessionBefore = db.prepare(
      "SELECT id, expires_at, last_seen_at FROM api_sessions WHERE revoked_at IS NULL ORDER BY created_at DESC LIMIT 1",
    ).get() as { id: string; expires_at: string; last_seen_at: string };
    const initialExpires = sessionBefore.expires_at;

    // Fast-forward last_seen_at by 2 hours so the throttle passes
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    db.prepare("UPDATE api_sessions SET last_seen_at = ? WHERE id = ?").run(twoHoursAgo, sessionBefore.id);
    db.close();

    // Make an API call which should trigger sliding update
    const meResp = await meRequest(cookie);
    expect(meResp.status).toBe(200);

    // Check that expires_at was extended
    const db2 = new Database(fixture.dbPath);
    const sessionAfter = db2.prepare(
      "SELECT expires_at, last_seen_at FROM api_sessions WHERE id = ?",
    ).get(sessionBefore.id) as { expires_at: string; last_seen_at: string };
    db2.close();

    expect(new Date(sessionAfter.expires_at).getTime()).toBeGreaterThan(
      new Date(initialExpires).getTime(),
    );
    expect(new Date(sessionAfter.last_seen_at).getTime()).toBeGreaterThan(
      new Date(twoHoursAgo).getTime(),
    );
  });

  it("throttles session expiry updates within 1 hour", async () => {
    await postRegister(
      new Request("http://localhost:3000/api/v1/auth/register", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({ email: "throttle-user@example.com", password: "Password123!" }),
      }),
    );

    const { cookie } = await loginAs("throttle-user@example.com");

    // Get initial session
    const db = new Database(fixture.dbPath);
    const sessionBefore = db.prepare(
      "SELECT id, expires_at, last_seen_at FROM api_sessions WHERE revoked_at IS NULL ORDER BY created_at DESC LIMIT 1",
    ).get() as { id: string; expires_at: string; last_seen_at: string };

    // Set last_seen_at to just 30 minutes ago (within throttle window)
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    db.prepare("UPDATE api_sessions SET last_seen_at = ? WHERE id = ?").run(thirtyMinutesAgo, sessionBefore.id);

    const expiresBeforeCall = db.prepare("SELECT expires_at FROM api_sessions WHERE id = ?").get(sessionBefore.id) as { expires_at: string };
    db.close();

    // Make API call — should NOT update because within throttle window
    await meRequest(cookie);

    const db2 = new Database(fixture.dbPath);
    const sessionAfter = db2.prepare(
      "SELECT expires_at, last_seen_at FROM api_sessions WHERE id = ?",
    ).get(sessionBefore.id) as { expires_at: string; last_seen_at: string };
    db2.close();

    // Expires_at should NOT have changed
    expect(sessionAfter.expires_at).toBe(expiresBeforeCall.expires_at);
  });

  // ── Absolute Maximum Lifetime ─────────────────────────────────────────

  it("rejects sessions older than absolute maximum lifetime (30 days)", async () => {
    await postRegister(
      new Request("http://localhost:3000/api/v1/auth/register", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({ email: "abs-max-user@example.com", password: "Password123!" }),
      }),
    );

    const { cookie } = await loginAs("abs-max-user@example.com");

    // Verify session works initially
    expect((await meRequest(cookie)).status).toBe(200);

    // Manipulate created_at to 31 days ago
    const db = new Database(fixture.dbPath);
    const thirtyOneDaysAgo = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString();
    const farFuture = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
    db.prepare(
      "UPDATE api_sessions SET created_at = ?, expires_at = ?, last_seen_at = ? WHERE revoked_at IS NULL",
    ).run(thirtyOneDaysAgo, farFuture, new Date().toISOString());
    db.close();

    // Session should be rejected despite recent activity and far-future expires_at
    expect((await meRequest(cookie)).status).toBe(401);
  });
});
