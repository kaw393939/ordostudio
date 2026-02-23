import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { POST as postLogin } from "../api/v1/auth/login/route";
import { POST as postRegister } from "../api/v1/auth/register/route";
import { POST as postResetRequest } from "../api/v1/auth/password-reset/request/route";
import { POST as postResetConfirm } from "../api/v1/auth/password-reset/confirm/route";
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

describe("e2e password reset", () => {
  beforeEach(async () => {
    fixture = await setupStandardE2EFixture();
    process.env.APPCTL_ENV = "local";
  });

  afterEach(async () => {
    await cleanupStandardE2EFixtures();
  });

  it("supports password reset request and confirm with one-time token", async () => {
    await postRegister(
      new Request("http://localhost:3000/api/v1/auth/register", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({
          email: "reset-user@example.com",
          password: "Password123!",
        }),
      }),
    );

    const requestReset = await postResetRequest(
      new Request("http://localhost:3000/api/v1/auth/password-reset/request", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
          "x-forwarded-for": "198.51.100.70",
        },
        body: JSON.stringify({ email: "reset-user@example.com" }),
      }),
    );

    expect(requestReset.status).toBe(202);
    const requestBody = await requestReset.json();
    expect(requestBody.accepted).toBe(true);
    expect(requestBody.reset_token).toBeTruthy();

    const oldPasswordLogin = await postLogin(
      new Request("http://localhost:3000/api/v1/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
          "x-forwarded-for": "198.51.100.71",
        },
        body: JSON.stringify({ email: "reset-user@example.com", password: "Password123!" }),
      }),
    );
    expect(oldPasswordLogin.status).toBe(200);

    const confirm = await postResetConfirm(
      new Request("http://localhost:3000/api/v1/auth/password-reset/confirm", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
          "x-forwarded-for": "198.51.100.71",
        },
        body: JSON.stringify({
          token: requestBody.reset_token,
          password: "NewPassword123!",
        }),
      }),
    );

    expect(confirm.status).toBe(200);

    const oldLoginAfterReset = await postLogin(
      new Request("http://localhost:3000/api/v1/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
          "x-forwarded-for": "198.51.100.71",
        },
        body: JSON.stringify({ email: "reset-user@example.com", password: "Password123!" }),
      }),
    );
    expect(oldLoginAfterReset.status).toBe(401);

    const newLoginAfterReset = await postLogin(
      new Request("http://localhost:3000/api/v1/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
          "x-forwarded-for": "198.51.100.71",
        },
        body: JSON.stringify({ email: "reset-user@example.com", password: "NewPassword123!" }),
      }),
    );
    expect(newLoginAfterReset.status).toBe(200);

    const reuse = await postResetConfirm(
      new Request("http://localhost:3000/api/v1/auth/password-reset/confirm", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({
          token: requestBody.reset_token,
          password: "AnotherPassword123!",
        }),
      }),
    );
    expect(reuse.status).toBe(409);
  });

  it("rejects expired password reset token", async () => {
    await postRegister(
      new Request("http://localhost:3000/api/v1/auth/register", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({
          email: "expired-reset@example.com",
          password: "Password123!",
        }),
      }),
    );

    const requestReset = await postResetRequest(
      new Request("http://localhost:3000/api/v1/auth/password-reset/request", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
          "x-forwarded-for": "198.51.100.71",
        },
        body: JSON.stringify({ email: "expired-reset@example.com" }),
      }),
    );
    const requestBody = await requestReset.json();

    const userId = userIdByEmail(fixture.dbPath, "expired-reset@example.com");
    const db = new Database(fixture.dbPath);
    db.prepare(
      "UPDATE api_password_resets SET expires_at = ?, used_at = NULL WHERE user_id = ?",
    ).run("2000-01-01T00:00:00.000Z", userId);
    db.close();

    const confirmExpired = await postResetConfirm(
      new Request("http://localhost:3000/api/v1/auth/password-reset/confirm", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({
          token: requestBody.reset_token,
          password: "NewPassword123!",
        }),
      }),
    );

    expect(confirmExpired.status).toBe(412);
  });

  it("accepts unknown email requests without leaking account existence", async () => {
    const response = await postResetRequest(
      new Request("http://localhost:3000/api/v1/auth/password-reset/request", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
          "x-forwarded-for": "198.51.100.72",
        },
        body: JSON.stringify({ email: "unknown@example.com" }),
      }),
    );

    expect(response.status).toBe(202);
    const body = await response.json();
    expect(body.accepted).toBe(true);
  });

  it("rate limits reset requests", async () => {
    let response: Response | null = null;

    for (let index = 0; index < 6; index += 1) {
      response = await postResetRequest(
        new Request("http://localhost:3000/api/v1/auth/password-reset/request", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            origin: "http://localhost:3000",
            "x-forwarded-for": "198.51.100.73",
          },
          body: JSON.stringify({ email: "rate-reset@example.com" }),
        }),
      );
    }

    expect(response?.status).toBe(429);
    expect(response?.headers.get("retry-after")).toBeTruthy();
  });
});
