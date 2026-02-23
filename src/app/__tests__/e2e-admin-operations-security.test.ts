import { randomUUID } from "node:crypto";
import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { POST as postLogin } from "../api/v1/auth/login/route";
import { POST as postRegister } from "../api/v1/auth/register/route";
import { POST as postEvents, GET as getEvents } from "../api/v1/events/route";
import { POST as postPublish } from "../api/v1/events/[slug]/publish/route";
import { POST as postCancel } from "../api/v1/events/[slug]/cancel/route";
import { POST as postRegistration } from "../api/v1/events/[slug]/registrations/route";
import { DELETE as deleteRegistration } from "../api/v1/events/[slug]/registrations/[userId]/route";
import { POST as postCheckin } from "../api/v1/events/[slug]/checkins/route";
import { GET as getExport } from "../api/v1/events/[slug]/export/route";
import { GET as getUsers } from "../api/v1/users/route";
import { PATCH as patchUser } from "../api/v1/users/[id]/route";
import { POST as postRole } from "../api/v1/users/[id]/roles/route";
import { DELETE as deleteRole } from "../api/v1/users/[id]/roles/[role]/route";
import {
  cleanupStandardE2EFixtures,
  setupStandardE2EFixture,
  type StandardE2EFixture,
} from "./helpers/e2e-fixtures";

let fixture: StandardE2EFixture;

const userIdByEmail = (dbPath: string, email: string) => {
  const db = new Database(dbPath);
  const row = db.prepare("SELECT id FROM users WHERE email = ?").get(email) as { id: string };
  db.close();
  return row.id;
};

describe("e2e admin operations security", () => {
  beforeEach(async () => {
    fixture = await setupStandardE2EFixture();
    process.env.APPCTL_ENV = "local";
  });

  afterEach(async () => {
    await cleanupStandardE2EFixtures();
  });

  it("enforces admin access boundaries for admin endpoints", async () => {
    const usersAsUser = await getUsers(
      new Request("http://localhost:3000/api/v1/users", {
        headers: {
          cookie: fixture.userCookie,
        },
      }),
    );
    expect(usersAsUser.status).toBe(403);

    const createAsUser = await postEvents(
      new Request("http://localhost:3000/api/v1/events", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
          cookie: fixture.userCookie,
        },
        body: JSON.stringify({
          slug: "forbidden-user-create",
          title: "Forbidden",
          start: "2026-11-01T10:00:00.000Z",
          end: "2026-11-01T11:00:00.000Z",
          timezone: "UTC",
        }),
      }),
    );

    expect(createAsUser.status).toBe(403);
  });

  it("supports admin event create/publish/cancel and validation/conflict checks", async () => {
    const invalidCreate = await postEvents(
      new Request("http://localhost:3000/api/v1/events", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
          cookie: fixture.adminCookie,
        },
        body: JSON.stringify({
          slug: "",
          title: "",
          start: "bad",
          end: "bad",
          timezone: "UTC",
        }),
      }),
    );
    expect(invalidCreate.status).toBe(422);

    const create = await postEvents(
      new Request("http://localhost:3000/api/v1/events", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
          cookie: fixture.adminCookie,
        },
        body: JSON.stringify({
          slug: "admin-security-event",
          title: "Admin Security Event",
          start: "2026-11-02T10:00:00.000Z",
          end: "2026-11-02T11:00:00.000Z",
          timezone: "UTC",
          capacity: 2,
        }),
      }),
    );
    expect(create.status).toBe(201);

    const conflict = await postEvents(
      new Request("http://localhost:3000/api/v1/events", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
          cookie: fixture.adminCookie,
        },
        body: JSON.stringify({
          slug: "admin-security-event",
          title: "Dup",
          start: "2026-11-02T10:00:00.000Z",
          end: "2026-11-02T11:00:00.000Z",
          timezone: "UTC",
        }),
      }),
    );
    expect(conflict.status).toBe(409);

    const publish = await postPublish(
      new Request("http://localhost:3000/api/v1/events/admin-security-event/publish", {
        method: "POST",
        headers: {
          origin: "http://localhost:3000",
          cookie: fixture.adminCookie,
        },
      }),
      { params: Promise.resolve({ slug: "admin-security-event" }) },
    );
    expect(publish.status).toBe(200);

    const cancelNoReason = await postCancel(
      new Request("http://localhost:3000/api/v1/events/admin-security-event/cancel", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
          cookie: fixture.adminCookie,
        },
        body: JSON.stringify({ reason: "" }),
      }),
      { params: Promise.resolve({ slug: "admin-security-event" }) },
    );
    expect(cancelNoReason.status).toBe(422);

    const cancel = await postCancel(
      new Request("http://localhost:3000/api/v1/events/admin-security-event/cancel", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
          cookie: fixture.adminCookie,
        },
        body: JSON.stringify({ reason: "Operational cancel" }),
      }),
      { params: Promise.resolve({ slug: "admin-security-event" }) },
    );
    expect(cancel.status).toBe(200);
  });

  it("enforces registration/check-in/export governance and rate limits", async () => {
    const addUnknownUser = await postRegistration(
      new Request("http://localhost:3000/api/v1/events/published-open/registrations", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
          cookie: fixture.adminCookie,
        },
        body: JSON.stringify({ user_id: randomUUID() }),
      }),
      { params: Promise.resolve({ slug: "published-open" }) },
    );
    expect(addUnknownUser.status).toBe(404);

    const cancelExisting = await deleteRegistration(
      new Request(`http://localhost:3000/api/v1/events/published-open/registrations/${fixture.userId}`, {
        method: "DELETE",
        headers: {
          origin: "http://localhost:3000",
          cookie: fixture.adminCookie,
        },
      }),
      { params: Promise.resolve({ slug: "published-open", userId: fixture.userId }) },
    );
    expect(cancelExisting.status).toBe(200);

    const checkinCancelled = await postCheckin(
      new Request("http://localhost:3000/api/v1/events/published-open/checkins", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
          cookie: fixture.adminCookie,
        },
        body: JSON.stringify({ user_id: fixture.userId }),
      }),
      { params: Promise.resolve({ slug: "published-open" }) },
    );
    expect(checkinCancelled.status).toBe(412);

    let exportResponse: Response | null = null;
    for (let index = 0; index < 6; index += 1) {
      exportResponse = await getExport(
        new Request("http://localhost:3000/api/v1/events/published-open/export?format=json", {
          headers: {
            cookie: fixture.adminCookie,
            "x-forwarded-for": "203.0.113.10",
          },
        }),
        { params: Promise.resolve({ slug: "published-open" }) },
      );
    }

    expect(exportResponse?.status).toBe(429);

    process.env.APPCTL_ENV = "prod";
    const includeEmailBlocked = await getExport(
      new Request("https://example.com/api/v1/events/published-open/export?format=json&include_email=true", {
        headers: {
          cookie: fixture.adminCookie,
          "x-forwarded-for": "203.0.113.20",
        },
      }),
      { params: Promise.resolve({ slug: "published-open" }) },
    );
    expect(includeEmailBlocked.status).toBe(403);
    process.env.APPCTL_ENV = "local";
  });

  it("enforces user role/state governance and blocks super-admin escalation", async () => {
    await postRegister(
      new Request("http://localhost:3000/api/v1/auth/register", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({
          email: "admin-ops-target@example.com",
          password: "Password123!",
        }),
      }),
    );

    const targetId = userIdByEmail(fixture.dbPath, "admin-ops-target@example.com");

    const addAdmin = await postRole(
      new Request(`http://localhost:3000/api/v1/users/${targetId}/roles`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
          cookie: fixture.adminCookie,
        },
        body: JSON.stringify({ role: "ADMIN", confirm: true }),
      }),
      { params: Promise.resolve({ id: targetId }) },
    );
    expect(addAdmin.status).toBe(200);
    expect((await addAdmin.json()).changed).toBe(true);

    const addAdminAgain = await postRole(
      new Request(`http://localhost:3000/api/v1/users/${targetId}/roles`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
          cookie: fixture.adminCookie,
        },
        body: JSON.stringify({ role: "ADMIN", confirm: true }),
      }),
      { params: Promise.resolve({ id: targetId }) },
    );
    expect((await addAdminAgain.json()).changed).toBe(false);

    const removeAdmin = await deleteRole(
      new Request(`http://localhost:3000/api/v1/users/${targetId}/roles/ADMIN?confirm=true`, {
        method: "DELETE",
        headers: {
          origin: "http://localhost:3000",
          cookie: fixture.adminCookie,
        },
      }),
      { params: Promise.resolve({ id: targetId, role: "ADMIN" }) },
    );
    expect((await removeAdmin.json()).changed).toBe(true);

    const removeAdminAgain = await deleteRole(
      new Request(`http://localhost:3000/api/v1/users/${targetId}/roles/ADMIN?confirm=true`, {
        method: "DELETE",
        headers: {
          origin: "http://localhost:3000",
          cookie: fixture.adminCookie,
        },
      }),
      { params: Promise.resolve({ id: targetId, role: "ADMIN" }) },
    );
    expect((await removeAdminAgain.json()).changed).toBe(false);

    const addSuperAdmin = await postRole(
      new Request(`http://localhost:3000/api/v1/users/${targetId}/roles`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
          cookie: fixture.adminCookie,
        },
        body: JSON.stringify({ role: "SUPER_ADMIN", confirm: true }),
      }),
      { params: Promise.resolve({ id: targetId }) },
    );
    expect(addSuperAdmin.status).toBe(403);

    const disable = await patchUser(
      new Request(`http://localhost:3000/api/v1/users/${targetId}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
          cookie: fixture.adminCookie,
        },
        body: JSON.stringify({ status: "DISABLED", confirm: true }),
      }),
      { params: Promise.resolve({ id: targetId }) },
    );
    expect(disable.status).toBe(200);

    const disabledLogin = await postLogin(
      new Request("http://localhost:3000/api/v1/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({
          email: "admin-ops-target@example.com",
          password: "Password123!",
        }),
      }),
    );
    expect(disabledLogin.status).toBe(401);

    const enable = await patchUser(
      new Request(`http://localhost:3000/api/v1/users/${targetId}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
          cookie: fixture.adminCookie,
        },
        body: JSON.stringify({ status: "ACTIVE", confirm: true }),
      }),
      { params: Promise.resolve({ id: targetId }) },
    );
    expect(enable.status).toBe(200);

    const activeLogin = await postLogin(
      new Request("http://localhost:3000/api/v1/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({
          email: "admin-ops-target@example.com",
          password: "Password123!",
        }),
      }),
    );
    expect(activeLogin.status).toBe(200);
  });

  it("keeps users listing usable for admin search/filter", async () => {
    const filtered = await getUsers(
      new Request("http://localhost:3000/api/v1/users?search=usera@example.com&role=USER&status=ACTIVE", {
        headers: {
          cookie: fixture.adminCookie,
        },
      }),
    );

    expect(filtered.status).toBe(200);
    const body = await filtered.json();
    expect(Array.isArray(body.items)).toBe(true);
    expect(body.items.some((user: { email: string }) => user.email === "usera@example.com")).toBe(true);

    const allEvents = await getEvents(new Request("http://localhost:3000/api/v1/events"));
    expect(allEvents.status).toBe(200);
  });
});
