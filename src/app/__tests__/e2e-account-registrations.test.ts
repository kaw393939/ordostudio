import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { GET as getAccountRegistrations } from "../api/v1/account/registrations/route";
import { POST as postRegister } from "../api/v1/auth/register/route";
import { POST as postLogin } from "../api/v1/auth/login/route";
import { POST as postEvent } from "../api/v1/events/route";
import { POST as postPublish } from "../api/v1/events/[slug]/publish/route";
import { POST as postRegistration } from "../api/v1/events/[slug]/registrations/route";
import { DELETE as deleteRegistration } from "../api/v1/events/[slug]/registrations/[userId]/route";
import { POST as postCheckin } from "../api/v1/events/[slug]/checkins/route";
import {
  cleanupStandardE2EFixtures,
  setupStandardE2EFixture,
  type StandardE2EFixture,
} from "./helpers/e2e-fixtures";

let fixture: StandardE2EFixture;

describe("e2e account registrations history", () => {
  beforeEach(async () => {
    fixture = await setupStandardE2EFixture();
    process.env.APPCTL_ENV = "local";
  });

  afterEach(async () => {
    await cleanupStandardE2EFixtures();
  });

  it("returns only registrations for the authenticated user", async () => {
    await postRegister(
      new Request("http://localhost:3000/api/v1/auth/register", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({
          email: "userb@example.com",
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
          email: "userb@example.com",
          password: "Password123!",
        }),
      }),
    );

    const userBCookie = (login.headers.get("set-cookie") ?? "").split(";")[0];

    const userBRegistrations = await getAccountRegistrations(
      new Request("http://localhost:3000/api/v1/account/registrations", {
        headers: { cookie: userBCookie },
      }),
    );

    expect(userBRegistrations.status).toBe(200);
    const userBBody = await userBRegistrations.json();
    expect(userBBody.count).toBe(0);
    expect(userBBody.items).toEqual([]);

    const userARegistrations = await getAccountRegistrations(
      new Request("http://localhost:3000/api/v1/account/registrations", {
        headers: { cookie: fixture.userCookie },
      }),
    );

    expect(userARegistrations.status).toBe(200);
    const userABody = await userARegistrations.json();
    expect(userABody.count).toBeGreaterThan(0);
    expect(userABody.items.every((item: { event_slug: string }) => item.event_slug !== "non-existent")).toBe(true);
  });

  it("reflects lifecycle status updates in account history", async () => {
    const cancel = await deleteRegistration(
      new Request(`http://localhost:3000/api/v1/events/published-open/registrations/${fixture.userId}`, {
        method: "DELETE",
        headers: {
          origin: "http://localhost:3000",
          cookie: fixture.userCookie,
        },
      }),
      { params: Promise.resolve({ slug: "published-open", userId: fixture.userId }) },
    );
    expect(cancel.status).toBe(200);

    const checkin = await postCheckin(
      new Request("http://localhost:3000/api/v1/events/published-full/checkins", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
          cookie: fixture.adminCookie,
        },
        body: JSON.stringify({ user_id: fixture.userId }),
      }),
      { params: Promise.resolve({ slug: "published-full" }) },
    );
    expect(checkin.status).toBe(200);

    const response = await getAccountRegistrations(
      new Request("http://localhost:3000/api/v1/account/registrations", {
        headers: { cookie: fixture.userCookie },
      }),
    );

    expect(response.status).toBe(200);
    const body = await response.json();

    const openRegistration = body.items.find(
      (item: { event_slug: string; status: string }) => item.event_slug === "published-open",
    );
    const fullRegistration = body.items.find(
      (item: { event_slug: string; status: string }) => item.event_slug === "published-full",
    );

    expect(openRegistration?.status).toBe("CANCELLED");
    expect(fullRegistration?.status).toBe("CHECKED_IN");
  });

  it("returns unauthorized without an active session", async () => {
    const response = await getAccountRegistrations(
      new Request("http://localhost:3000/api/v1/account/registrations"),
    );

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.type).toBe("https://lms-219.dev/problems/unauthorized");
  });

  it("orders upcoming registrations before past ones and includes affordance links", async () => {
    const createPast = await postEvent(
      new Request("http://localhost:3000/api/v1/events", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
          cookie: fixture.adminCookie,
        },
        body: JSON.stringify({
          slug: "past-event",
          title: "Past Event",
          start: "2025-01-01T10:00:00.000Z",
          end: "2025-01-01T11:00:00.000Z",
          timezone: "UTC",
          capacity: 20,
        }),
      }),
    );
    expect(createPast.status).toBe(201);

    const publishPast = await postPublish(
      new Request("http://localhost:3000/api/v1/events/past-event/publish", {
        method: "POST",
        headers: {
          origin: "http://localhost:3000",
          cookie: fixture.adminCookie,
        },
      }),
      { params: Promise.resolve({ slug: "past-event" }) },
    );
    expect(publishPast.status).toBe(200);

    const registerPast = await postRegistration(
      new Request("http://localhost:3000/api/v1/events/past-event/registrations", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
          cookie: fixture.userCookie,
        },
        body: JSON.stringify({ user_id: fixture.userId }),
      }),
      { params: Promise.resolve({ slug: "past-event" }) },
    );
    expect(registerPast.status).toBe(200);

    const response = await getAccountRegistrations(
      new Request("http://localhost:3000/api/v1/account/registrations", {
        headers: { cookie: fixture.userCookie },
      }),
    );

    expect(response.status).toBe(200);
    const body = await response.json();

    const pastIndex = body.items.findIndex((item: { event_slug: string }) => item.event_slug === "past-event");
    const upcomingIndex = body.items.findIndex((item: { event_slug: string }) => item.event_slug === "published-open");

    expect(upcomingIndex).toBeGreaterThanOrEqual(0);
    expect(pastIndex).toBeGreaterThan(upcomingIndex);

    const upcoming = body.items.find((item: { event_slug: string }) => item.event_slug === "published-open");
    expect(upcoming._links.event.href).toBe("/events/published-open");
    expect(upcoming._links["app:cancel"].href).toContain("/api/v1/events/published-open/registrations/");
  });
});
