import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { POST as postLogin } from "../api/v1/auth/login/route";
import { POST as postRegister } from "../api/v1/auth/register/route";
import { POST as postVerifyRequest } from "../api/v1/auth/verify/request/route";
import { POST as postVerifyConfirm } from "../api/v1/auth/verify/confirm/route";
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

describe("e2e email verification", () => {
  beforeEach(async () => {
    fixture = await setupStandardE2EFixture();
    process.env.APPCTL_ENV = "local";
    process.env.APPCTL_REQUIRE_EMAIL_VERIFICATION = "true";
  });

  afterEach(async () => {
    delete process.env.APPCTL_REQUIRE_EMAIL_VERIFICATION;
    await cleanupStandardE2EFixtures();
  });

  it("requires verification before login and allows login after confirm", async () => {
    const register = await postRegister(
      new Request("http://localhost:3000/api/v1/auth/register", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({
          email: "verify-user@example.com",
          password: "Password123!",
        }),
      }),
    );

    expect(register.status).toBe(201);
    const registerBody = await register.json();
    expect(registerBody.status).toBe("PENDING");

    const loginBlocked = await postLogin(
      new Request("http://localhost:3000/api/v1/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({
          email: "verify-user@example.com",
          password: "Password123!",
        }),
      }),
    );

    expect(loginBlocked.status).toBe(403);
    const blockedBody = await loginBlocked.json();
    expect(blockedBody.type).toContain("email-unverified");
    expect(blockedBody.request_id).toBeTruthy();

    const resend = await postVerifyRequest(
      new Request("http://localhost:3000/api/v1/auth/verify/request", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
          "x-forwarded-for": "198.51.100.81",
        },
        body: JSON.stringify({ email: "verify-user@example.com" }),
      }),
    );

    expect(resend.status).toBe(202);
    const resendBody = await resend.json();
    expect(resendBody.verification_token).toBeTruthy();

    const confirm = await postVerifyConfirm(
      new Request("http://localhost:3000/api/v1/auth/verify/confirm", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({ token: resendBody.verification_token }),
      }),
    );

    expect(confirm.status).toBe(200);

    const loginAllowed = await postLogin(
      new Request("http://localhost:3000/api/v1/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({
          email: "verify-user@example.com",
          password: "Password123!",
        }),
      }),
    );

    expect(loginAllowed.status).toBe(200);
  });

  it("rejects expired verification token", async () => {
    await postRegister(
      new Request("http://localhost:3000/api/v1/auth/register", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({
          email: "expired-verify@example.com",
          password: "Password123!",
        }),
      }),
    );

    const requestToken = await postVerifyRequest(
      new Request("http://localhost:3000/api/v1/auth/verify/request", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
          "x-forwarded-for": "198.51.100.82",
        },
        body: JSON.stringify({ email: "expired-verify@example.com" }),
      }),
    );
    const tokenBody = await requestToken.json();

    const userId = userIdByEmail(fixture.dbPath, "expired-verify@example.com");
    const db = new Database(fixture.dbPath);
    db.prepare(
      "UPDATE api_email_verifications SET expires_at = ?, used_at = NULL WHERE user_id = ?",
    ).run("2000-01-01T00:00:00.000Z", userId);
    db.close();

    const confirmExpired = await postVerifyConfirm(
      new Request("http://localhost:3000/api/v1/auth/verify/confirm", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({ token: tokenBody.verification_token }),
      }),
    );

    expect(confirmExpired.status).toBe(412);
  });

  it("supports resend lifecycle and blocks old token after resend", async () => {
    await postRegister(
      new Request("http://localhost:3000/api/v1/auth/register", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({
          email: "resend-verify@example.com",
          password: "Password123!",
        }),
      }),
    );

    const first = await postVerifyRequest(
      new Request("http://localhost:3000/api/v1/auth/verify/request", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
          "x-forwarded-for": "198.51.100.83",
        },
        body: JSON.stringify({ email: "resend-verify@example.com" }),
      }),
    );
    const firstBody = await first.json();

    const second = await postVerifyRequest(
      new Request("http://localhost:3000/api/v1/auth/verify/request", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
          "x-forwarded-for": "198.51.100.83",
        },
        body: JSON.stringify({ email: "resend-verify@example.com" }),
      }),
    );
    const secondBody = await second.json();

    const confirmOld = await postVerifyConfirm(
      new Request("http://localhost:3000/api/v1/auth/verify/confirm", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({ token: firstBody.verification_token }),
      }),
    );
    expect(confirmOld.status).toBe(409);

    const confirmNew = await postVerifyConfirm(
      new Request("http://localhost:3000/api/v1/auth/verify/confirm", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({ token: secondBody.verification_token }),
      }),
    );
    expect(confirmNew.status).toBe(200);
  });

  it("rate limits verification resend endpoint", async () => {
    let response: Response | null = null;

    for (let index = 0; index < 6; index += 1) {
      response = await postVerifyRequest(
        new Request("http://localhost:3000/api/v1/auth/verify/request", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            origin: "http://localhost:3000",
            "x-forwarded-for": "198.51.100.84",
          },
          body: JSON.stringify({ email: "any@example.com" }),
        }),
      );
    }

    expect(response?.status).toBe(429);
    expect(response?.headers.get("retry-after")).toBeTruthy();
  });
});
