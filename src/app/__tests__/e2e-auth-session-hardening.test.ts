import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { GET as getMe } from "../api/v1/me/route";
import { GET as getUsers } from "../api/v1/users/route";
import { POST as postLogin } from "../api/v1/auth/login/route";
import { POST as postLogout } from "../api/v1/auth/logout/route";
import { POST as postRegister } from "../api/v1/auth/register/route";
import {
  cleanupStandardE2EFixtures,
  setupStandardE2EFixture,
  type StandardE2EFixture,
} from "./helpers/e2e-fixtures";

let fixture: StandardE2EFixture;

describe("e2e auth session hardening", () => {
  beforeEach(async () => {
    fixture = await setupStandardE2EFixture();
    process.env.APPCTL_ENV = "local";
  });

  afterEach(async () => {
    await cleanupStandardE2EFixtures();
  });

  it("supports register/login/logout lifecycle with me gating", async () => {
    const register = await postRegister(
      new Request("http://localhost:3000/api/v1/auth/register", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
          "x-forwarded-for": "198.51.100.10",
        },
        body: JSON.stringify({
          email: "sprint22-user@example.com",
          password: "Password123!",
        }),
      }),
    );

    expect(register.status).toBe(201);

    const login = await postLogin(
      new Request("http://localhost:3000/api/v1/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
          "x-forwarded-for": "198.51.100.10",
        },
        body: JSON.stringify({
          email: "sprint22-user@example.com",
          password: "Password123!",
        }),
      }),
    );

    expect(login.status).toBe(200);
    const cookie = (login.headers.get("set-cookie") ?? "").split(";")[0];

    const meBeforeLogout = await getMe(
      new Request("http://localhost:3000/api/v1/me", {
        method: "GET",
        headers: {
          cookie,
        },
      }),
    );
    expect(meBeforeLogout.status).toBe(200);

    const logout = await postLogout(
      new Request("http://localhost:3000/api/v1/auth/logout", {
        method: "POST",
        headers: {
          origin: "http://localhost:3000",
          cookie,
        },
      }),
    );

    expect(logout.status).toBe(200);
    expect(logout.headers.get("set-cookie")).toContain("Max-Age=0");

    const meAfterLogout = await getMe(
      new Request("http://localhost:3000/api/v1/me", {
        method: "GET",
        headers: {
          cookie,
        },
      }),
    );

    expect(meAfterLogout.status).toBe(401);
  });

  it("shows invalid credentials as problem details with request correlation", async () => {
    const failedLogin = await postLogin(
      new Request("http://localhost:3000/api/v1/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
          "x-forwarded-for": "198.51.100.20",
        },
        body: JSON.stringify({
          email: "usera@example.com",
          password: "wrong-password",
        }),
      }),
    );

    expect(failedLogin.status).toBe(401);
    expect(failedLogin.headers.get("content-type")).toContain("application/problem+json");

    const body = await failedLogin.json();
    expect(body.title).toBe("Unauthorized");
    expect(body.status).toBe(401);
    expect(body.request_id).toBeTruthy();
    expect(failedLogin.headers.get("x-request-id")).toBe(body.request_id);
  });

  it("enforces rate limits for login and register", async () => {
    let loginResponse: Response | null = null;
    for (let index = 0; index < 6; index += 1) {
      loginResponse = await postLogin(
        new Request("http://localhost:3000/api/v1/auth/login", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            origin: "http://localhost:3000",
            "x-forwarded-for": "198.51.100.30",
          },
          body: JSON.stringify({
            email: "usera@example.com",
            password: "bad-password",
          }),
        }),
      );
    }

    expect(loginResponse?.status).toBe(429);

    let registerResponse: Response | null = null;
    for (let index = 0; index < 6; index += 1) {
      registerResponse = await postRegister(
        new Request("http://localhost:3000/api/v1/auth/register", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            origin: "http://localhost:3000",
            "x-forwarded-for": "198.51.100.40",
          },
          body: JSON.stringify({
            email: "rate-limit-user@example.com",
            password: "Password123!",
          }),
        }),
      );
    }

    expect(registerResponse?.status).toBe(429);
    expect(registerResponse?.headers.get("retry-after")).toBeTruthy();
  });

  it("blocks csrf-unsafe auth mutations with problem details", async () => {
    const csrfBlockedRegister = await postRegister(
      new Request("http://localhost:3000/api/v1/auth/register", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "https://evil.example",
          "x-forwarded-for": "198.51.100.50",
        },
        body: JSON.stringify({
          email: "csrf-user@example.com",
          password: "Password123!",
        }),
      }),
    );

    expect(csrfBlockedRegister.status).toBe(403);
    expect(csrfBlockedRegister.headers.get("content-type")).toContain("application/problem+json");

    const body = await csrfBlockedRegister.json();
    expect(body.title).toBe("Forbidden");
    expect(body.request_id).toBeTruthy();
  });

  it("supports role-aware me links and blocks admin routes when session expires", async () => {
    const meAsAdmin = await getMe(
      new Request("http://localhost:3000/api/v1/me", {
        method: "GET",
        headers: {
          cookie: fixture.adminCookie,
        },
      }),
    );

    expect(meAsAdmin.status).toBe(200);
    const meBody = await meAsAdmin.json();
    expect(meBody._links.users.href).toBe("/api/v1/users");

    const logout = await postLogout(
      new Request("http://localhost:3000/api/v1/auth/logout", {
        method: "POST",
        headers: {
          origin: "http://localhost:3000",
          cookie: fixture.adminCookie,
        },
      }),
    );
    expect(logout.status).toBe(200);

    const usersAfterExpiry = await getUsers(
      new Request("http://localhost:3000/api/v1/users", {
        headers: {
          cookie: fixture.adminCookie,
        },
      }),
    );

    expect(usersAfterExpiry.status).toBe(401);
    expect(usersAfterExpiry.headers.get("content-type")).toContain("application/problem+json");
  });
});
