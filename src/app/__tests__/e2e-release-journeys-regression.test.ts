import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { POST as postLogin } from "../api/v1/auth/login/route";
import { POST as postRegister } from "../api/v1/auth/register/route";
import { POST as postEvents } from "../api/v1/events/route";
import { POST as postPublish } from "../api/v1/events/[slug]/publish/route";
import { POST as postRegistration } from "../api/v1/events/[slug]/registrations/route";
import { DELETE as deleteRegistration } from "../api/v1/events/[slug]/registrations/[userId]/route";
import { POST as postCheckin } from "../api/v1/events/[slug]/checkins/route";
import { GET as getExport } from "../api/v1/events/[slug]/export/route";
import { GET as getMe } from "../api/v1/me/route";
import { GET as getUsers } from "../api/v1/users/route";
import { DELETE as deleteRole } from "../api/v1/users/[id]/roles/[role]/route";
import { requestHal } from "../../lib/hal-client";
import {
  cleanupStandardE2EFixtures,
  setupStandardE2EFixture,
  type StandardE2EFixture,
} from "./helpers/e2e-fixtures";

let fixture: StandardE2EFixture;

describe("e2e release journeys regression", () => {
  beforeEach(async () => {
    fixture = await setupStandardE2EFixture();
    process.env.APPCTL_ENV = "local";
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await cleanupStandardE2EFixtures();
  });

  it("passes the public journey browse-register-waitlist-cancel", async () => {
    await postRegister(
      new Request("http://localhost:3000/api/v1/auth/register", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({
          email: "release-public@example.com",
          password: "Password123!",
        }),
      }),
    );

    const login = await postLogin(
      new Request("http://localhost:3000/api/v1/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({
          email: "release-public@example.com",
          password: "Password123!",
        }),
      }),
    );

    const cookie = (login.headers.get("set-cookie") ?? "").split(";")[0];

    const me = await getMe(
      new Request("http://localhost:3000/api/v1/me", {
        headers: { cookie },
      }),
    );
    const meBody = await me.json();

    const registerOpen = await postRegistration(
      new Request("http://localhost:3000/api/v1/events/published-open/registrations", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
          cookie,
        },
        body: JSON.stringify({ user_id: meBody.id }),
      }),
      { params: Promise.resolve({ slug: "published-open" }) },
    );
    expect(registerOpen.status).toBe(200);
    expect((await registerOpen.json()).status).toBe("REGISTERED");

    const waitlist = await postRegistration(
      new Request("http://localhost:3000/api/v1/events/published-full/registrations", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
          cookie,
        },
        body: JSON.stringify({ user_id: meBody.id }),
      }),
      { params: Promise.resolve({ slug: "published-full" }) },
    );
    expect(waitlist.status).toBe(200);
    expect((await waitlist.json()).status).toBe("WAITLISTED");

    const cancel = await deleteRegistration(
      new Request(`http://localhost:3000/api/v1/events/published-open/registrations/${meBody.id}`, {
        method: "DELETE",
        headers: {
          origin: "http://localhost:3000",
          cookie,
        },
      }),
      { params: Promise.resolve({ slug: "published-open", userId: meBody.id }) },
    );

    expect(cancel.status).toBe(200);
    expect((await cancel.json()).status).toBe("CANCELLED");
  });

  it("passes the admin journey create-publish-register-checkin-export", async () => {
    const create = await postEvents(
      new Request("http://localhost:3000/api/v1/events", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
          cookie: fixture.adminCookie,
        },
        body: JSON.stringify({
          slug: "release-admin-journey",
          title: "Release Admin Journey",
          start: "2026-12-01T10:00:00.000Z",
          end: "2026-12-01T11:00:00.000Z",
          timezone: "UTC",
          capacity: 10,
        }),
      }),
    );
    expect(create.status).toBe(201);

    const publish = await postPublish(
      new Request("http://localhost:3000/api/v1/events/release-admin-journey/publish", {
        method: "POST",
        headers: {
          origin: "http://localhost:3000",
          cookie: fixture.adminCookie,
        },
      }),
      { params: Promise.resolve({ slug: "release-admin-journey" }) },
    );
    expect(publish.status).toBe(200);

    const addRegistration = await postRegistration(
      new Request("http://localhost:3000/api/v1/events/release-admin-journey/registrations", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
          cookie: fixture.adminCookie,
        },
        body: JSON.stringify({ user_id: fixture.userId }),
      }),
      { params: Promise.resolve({ slug: "release-admin-journey" }) },
    );
    expect(addRegistration.status).toBe(200);

    const checkin = await postCheckin(
      new Request("http://localhost:3000/api/v1/events/release-admin-journey/checkins", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
          cookie: fixture.adminCookie,
        },
        body: JSON.stringify({ user_id: fixture.userId }),
      }),
      { params: Promise.resolve({ slug: "release-admin-journey" }) },
    );
    expect(checkin.status).toBe(200);

    const exported = await getExport(
      new Request("http://localhost:3000/api/v1/events/release-admin-journey/export?format=json", {
        headers: { cookie: fixture.adminCookie },
      }),
      { params: Promise.resolve({ slug: "release-admin-journey" }) },
    );

    expect(exported.status).toBe(200);
    expect(exported.headers.get("content-type")).toContain("application/json");
  });

  it("keeps request_id supportability in surfaced API errors", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          type: "about:blank",
          title: "Internal Server Error",
          status: 500,
          detail: "Injected failure",
          request_id: "req-release-journey-1",
        }),
        {
          status: 500,
          headers: {
            "content-type": "application/problem+json",
          },
        },
      ),
    );

    const failed = await requestHal<{ ok: true }>("/api/v1/events");
    expect(failed.ok).toBe(false);
    if (!failed.ok) {
      expect(failed.problem.request_id).toBe("req-release-journey-1");
      expect(failed.problem.status).toBe(500);
    }
  });

  it("removes admin access immediately after role downgrade mid-session", async () => {
    const meBefore = await getMe(
      new Request("http://localhost:3000/api/v1/me", {
        headers: { cookie: fixture.adminCookie },
      }),
    );
    expect(meBefore.status).toBe(200);
    const meBeforeBody = await meBefore.json();
    expect(meBeforeBody.roles).toContain("ADMIN");

    const roleRemoval = await deleteRole(
      new Request(`http://localhost:3000/api/v1/users/${fixture.adminId}/roles/ADMIN?confirm=true`, {
        method: "DELETE",
        headers: {
          origin: "http://localhost:3000",
          cookie: fixture.superAdminCookie,
        },
      }),
      { params: Promise.resolve({ id: fixture.adminId, role: "ADMIN" }) },
    );
    expect(roleRemoval.status).toBe(200);

    const meAfter = await getMe(
      new Request("http://localhost:3000/api/v1/me", {
        headers: { cookie: fixture.adminCookie },
      }),
    );
    expect(meAfter.status).toBe(200);
    const meAfterBody = await meAfter.json();
    expect(meAfterBody.roles).not.toContain("ADMIN");

    const createAfter = await postEvents(
      new Request("http://localhost:3000/api/v1/events", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
          cookie: fixture.adminCookie,
        },
        body: JSON.stringify({
          slug: "forbidden-create",
          title: "Forbidden",
          start: "2026-11-01T10:00:00.000Z",
          end: "2026-11-01T11:00:00.000Z",
          timezone: "UTC",
        }),
      }),
    );
    expect(createAfter.status).toBe(403);
  });
});
