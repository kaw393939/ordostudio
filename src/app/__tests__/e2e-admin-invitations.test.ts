import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { POST as postInvite } from "../api/v1/admin/invitations/route";
import { POST as postAcceptInvite } from "../api/v1/admin/invitations/accept/route";
import { POST as postLogin } from "../api/v1/auth/login/route";
import { POST as postRegister } from "../api/v1/auth/register/route";
import { GET as getMe } from "../api/v1/me/route";
import {
  cleanupStandardE2EFixtures,
  setupStandardE2EFixture,
  type StandardE2EFixture,
} from "./helpers/e2e-fixtures";

let fixture: StandardE2EFixture;

const findInviteIdByEmail = (dbPath: string, email: string) => {
  const db = new Database(dbPath);
  const row = db.prepare("SELECT id FROM api_admin_invitations WHERE email = ? ORDER BY created_at DESC LIMIT 1").get(email) as { id: string };
  db.close();
  return row.id;
};

describe("e2e admin invitations", () => {
  beforeEach(async () => {
    fixture = await setupStandardE2EFixture();
    process.env.APPCTL_ENV = "local";
  });

  afterEach(async () => {
    await cleanupStandardE2EFixtures();
  });

  it("allows admin to invite and invited user to accept as ADMIN", async () => {
    const invite = await postInvite(
      new Request("http://localhost:3000/api/v1/admin/invitations", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
          cookie: fixture.adminCookie,
        },
        body: JSON.stringify({ email: "invitee@example.com" }),
      }),
    );

    expect(invite.status).toBe(201);
    const inviteBody = await invite.json();
    expect(inviteBody.role).toBe("ADMIN");
    expect(inviteBody.invitation_token).toBeTruthy();

    const accept = await postAcceptInvite(
      new Request("http://localhost:3000/api/v1/admin/invitations/accept", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({
          token: inviteBody.invitation_token,
          password: "Password123!",
        }),
      }),
    );

    expect(accept.status).toBe(200);

    const login = await postLogin(
      new Request("http://localhost:3000/api/v1/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({
          email: "invitee@example.com",
          password: "Password123!",
        }),
      }),
    );

    expect(login.status).toBe(200);
    const cookie = (login.headers.get("set-cookie") ?? "").split(";")[0];

    const me = await getMe(
      new Request("http://localhost:3000/api/v1/me", {
        headers: {
          cookie,
        },
      }),
    );
    expect(me.status).toBe(200);

    const meBody = await me.json();
    expect(meBody.roles).toContain("ADMIN");
    expect(meBody.roles).not.toContain("SUPER_ADMIN");
  });

  it("blocks invitation reuse and expired invitations", async () => {
    const invite = await postInvite(
      new Request("http://localhost:3000/api/v1/admin/invitations", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
          cookie: fixture.adminCookie,
        },
        body: JSON.stringify({ email: "reuse-invitee@example.com" }),
      }),
    );

    const inviteBody = await invite.json();

    const firstAccept = await postAcceptInvite(
      new Request("http://localhost:3000/api/v1/admin/invitations/accept", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({
          token: inviteBody.invitation_token,
          password: "Password123!",
        }),
      }),
    );
    expect(firstAccept.status).toBe(200);

    const reuse = await postAcceptInvite(
      new Request("http://localhost:3000/api/v1/admin/invitations/accept", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({
          token: inviteBody.invitation_token,
          password: "Password123!",
        }),
      }),
    );
    expect(reuse.status).toBe(409);

    const invite2 = await postInvite(
      new Request("http://localhost:3000/api/v1/admin/invitations", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
          cookie: fixture.adminCookie,
        },
        body: JSON.stringify({ email: "expired-invitee@example.com" }),
      }),
    );

    const inviteBody2 = await invite2.json();
    const inviteId = findInviteIdByEmail(fixture.dbPath, "expired-invitee@example.com");
    const db = new Database(fixture.dbPath);
    db.prepare("UPDATE api_admin_invitations SET expires_at = ? WHERE id = ?").run("2000-01-01T00:00:00.000Z", inviteId);
    db.close();

    const expiredAccept = await postAcceptInvite(
      new Request("http://localhost:3000/api/v1/admin/invitations/accept", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({
          token: inviteBody2.invitation_token,
          password: "Password123!",
        }),
      }),
    );

    expect(expiredAccept.status).toBe(412);
  });

  it("rejects invites for existing accounts and unauthorized invite attempts", async () => {
    await postRegister(
      new Request("http://localhost:3000/api/v1/auth/register", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({
          email: "existing@example.com",
          password: "Password123!",
        }),
      }),
    );

    const existingConflict = await postInvite(
      new Request("http://localhost:3000/api/v1/admin/invitations", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
          cookie: fixture.adminCookie,
        },
        body: JSON.stringify({ email: "existing@example.com" }),
      }),
    );
    expect(existingConflict.status).toBe(409);

    const asUser = await postInvite(
      new Request("http://localhost:3000/api/v1/admin/invitations", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
          cookie: fixture.userCookie,
        },
        body: JSON.stringify({ email: "forbidden@example.com" }),
      }),
    );
    expect(asUser.status).toBe(403);

    const asAnon = await postInvite(
      new Request("http://localhost:3000/api/v1/admin/invitations", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({ email: "anon@example.com" }),
      }),
    );
    expect(asAnon.status).toBe(401);
  });
});
