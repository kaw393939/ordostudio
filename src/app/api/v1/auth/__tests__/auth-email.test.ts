import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { POST as postRegister } from "../register/route";
import { POST as postLogin } from "../login/route";
import { POST as postPasswordResetRequest } from "../password-reset/request/route";
import { POST as postPasswordResetConfirm } from "../password-reset/confirm/route";
import { POST as postVerifyConfirm } from "../verify/confirm/route";
import { runCli } from "../../../../../cli/run-cli";
import type { CliIo } from "../../../../../cli/types";
import { resetRateLimits } from "../../../../../lib/api/rate-limit";
import { FakeTransactionalEmail } from "../../../../../core/ports/__tests__/fake-transactional-email";
import {
  setTransactionalEmailPort,
  resetTransactionalEmailPort,
} from "../../../../../platform/email";

const tempDirs: string[] = [];
const fakeEmail = new FakeTransactionalEmail();

const createDbPath = async (): Promise<string> => {
  const directory = await mkdtemp(join(tmpdir(), "appctl-email-e2e-"));
  tempDirs.push(directory);
  return join(directory, "app.db");
};

const createIo = (): { io: CliIo; stdout: string[]; stderr: string[] } => {
  const stdout: string[] = [];
  const stderr: string[] = [];
  return {
    io: {
      writeStdout: (msg: string) => stdout.push(msg),
      writeStderr: (msg: string) => stderr.push(msg),
    },
    stdout,
    stderr,
  };
};

const runWithDb = async (argv: string[], dbPath: string): Promise<number> => {
  const { io } = createIo();
  const prev = process.env.APPCTL_DB_FILE;
  process.env.APPCTL_DB_FILE = dbPath;
  const code = await runCli(argv, io);
  if (prev === undefined) delete process.env.APPCTL_DB_FILE;
  else process.env.APPCTL_DB_FILE = prev;
  return code;
};

const setupBase = async (dbPath: string) => {
  await runWithDb(["db", "migrate"], dbPath);
  await runWithDb(["db", "seed"], dbPath);
};

afterEach(async () => {
  delete process.env.APPCTL_DB_FILE;
  delete process.env.APPCTL_ENV;
  delete process.env.APPCTL_REQUIRE_EMAIL_VERIFICATION;
  resetRateLimits();
  resetTransactionalEmailPort();
  fakeEmail.reset();
  await Promise.all(tempDirs.splice(0).map((d) => rm(d, { recursive: true, force: true })));
});

describe("transactional email integration", () => {
  it("password reset sends email with valid reset link", async () => {
    const dbPath = await createDbPath();
    await setupBase(dbPath);
    process.env.APPCTL_DB_FILE = dbPath;
    process.env.APPCTL_ENV = "local";
    setTransactionalEmailPort(fakeEmail);

    // 1. Register user
    const regResponse = await postRegister(
      new Request("http://localhost:3000/api/v1/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json", origin: "http://localhost:3000" },
        body: JSON.stringify({ email: "reset-test@example.com", password: "Password123!" }),
      }),
    );
    expect(regResponse.status).toBe(201);

    // Clear welcome email from sentMessages
    fakeEmail.sentMessages = [];

    // 2. Request password reset
    const resetResponse = await postPasswordResetRequest(
      new Request("http://localhost:3000/api/v1/auth/password-reset/request", {
        method: "POST",
        headers: { "content-type": "application/json", origin: "http://localhost:3000" },
        body: JSON.stringify({ email: "reset-test@example.com" }),
      }),
    );
    expect(resetResponse.status).toBe(202);

    // Wait a tick for fire-and-forget
    await new Promise((r) => setTimeout(r, 50));

    // 3. Assert email was sent
    expect(fakeEmail.sentMessages.length).toBeGreaterThanOrEqual(1);
    const resetEmail = fakeEmail.sentMessages.find((m) =>
      m.subject.toLowerCase().includes("password reset"),
    );
    expect(resetEmail).toBeDefined();

    // 4. Assert correct recipient
    expect(resetEmail!.to).toBe("reset-test@example.com");

    // 5. Assert email body contains a URL with a reset token
    const tokenMatch = resetEmail!.textBody.match(/token=([a-zA-Z0-9_]+)/);
    expect(tokenMatch).toBeTruthy();
    const extractedToken = tokenMatch![1];

    // 6. Also get the token from the response (local env returns it)
    const resetBody = (await resetResponse.json()) as { reset_token?: string };

    // 7. Confirm reset with extracted token
    const confirmResponse = await postPasswordResetConfirm(
      new Request("http://localhost:3000/api/v1/auth/password-reset/confirm", {
        method: "POST",
        headers: { "content-type": "application/json", origin: "http://localhost:3000" },
        body: JSON.stringify({
          token: resetBody.reset_token ?? extractedToken,
          password: "NewPassword456!",
        }),
      }),
    );
    expect(confirmResponse.status).toBe(200);

    // 8. Login with new password succeeds
    const newLoginResponse = await postLogin(
      new Request("http://localhost:3000/api/v1/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json", origin: "http://localhost:3000" },
        body: JSON.stringify({ email: "reset-test@example.com", password: "NewPassword456!" }),
      }),
    );
    expect(newLoginResponse.status).toBe(200);

    // 9. Login with old password fails
    const oldLoginResponse = await postLogin(
      new Request("http://localhost:3000/api/v1/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json", origin: "http://localhost:3000" },
        body: JSON.stringify({ email: "reset-test@example.com", password: "Password123!" }),
      }),
    );
    expect(oldLoginResponse.status).toBe(401);
  });

  it("email verification sends email with valid verify link", async () => {
    const dbPath = await createDbPath();
    await setupBase(dbPath);
    process.env.APPCTL_DB_FILE = dbPath;
    process.env.APPCTL_ENV = "local";
    process.env.APPCTL_REQUIRE_EMAIL_VERIFICATION = "true";
    setTransactionalEmailPort(fakeEmail);

    // 1. Register user (with verification required)
    const regResponse = await postRegister(
      new Request("http://localhost:3000/api/v1/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json", origin: "http://localhost:3000" },
        body: JSON.stringify({ email: "verify-test@example.com", password: "Password123!" }),
      }),
    );
    expect(regResponse.status).toBe(201);

    // Wait for fire-and-forget
    await new Promise((r) => setTimeout(r, 50));

    // 2. Assert welcome + verification emails received
    const welcomeEmail = fakeEmail.sentMessages.find((m) =>
      m.subject.toLowerCase().includes("welcome"),
    );
    expect(welcomeEmail).toBeDefined();

    const verifyEmail = fakeEmail.sentMessages.find((m) =>
      m.subject.toLowerCase().includes("verify"),
    );
    expect(verifyEmail).toBeDefined();

    // 3. Extract verify token from email body
    const tokenMatch = verifyEmail!.textBody.match(/token=([a-zA-Z0-9_]+)/);
    expect(tokenMatch).toBeTruthy();
    const extractedToken = tokenMatch![1];

    // 4. Confirm verification
    const confirmResponse = await postVerifyConfirm(
      new Request("http://localhost:3000/api/v1/auth/verify/confirm", {
        method: "POST",
        headers: { "content-type": "application/json", origin: "http://localhost:3000" },
        body: JSON.stringify({ token: extractedToken }),
      }),
    );
    expect(confirmResponse.status).toBe(200);

    // 5. Login succeeds (user is now ACTIVE)
    const loginResponse = await postLogin(
      new Request("http://localhost:3000/api/v1/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json", origin: "http://localhost:3000" },
        body: JSON.stringify({ email: "verify-test@example.com", password: "Password123!" }),
      }),
    );
    expect(loginResponse.status).toBe(200);
  });

  it("registration sends welcome email (no verification required)", async () => {
    const dbPath = await createDbPath();
    await setupBase(dbPath);
    process.env.APPCTL_DB_FILE = dbPath;
    process.env.APPCTL_ENV = "local";
    setTransactionalEmailPort(fakeEmail);

    const regResponse = await postRegister(
      new Request("http://localhost:3000/api/v1/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json", origin: "http://localhost:3000" },
        body: JSON.stringify({ email: "welcome-test@example.com", password: "Password123!" }),
      }),
    );
    expect(regResponse.status).toBe(201);

    // Wait for fire-and-forget
    await new Promise((r) => setTimeout(r, 50));

    const welcomeEmail = fakeEmail.sentMessages.find((m) =>
      m.subject.toLowerCase().includes("welcome"),
    );
    expect(welcomeEmail).toBeDefined();
    expect(welcomeEmail!.to).toBe("welcome-test@example.com");
  });

  it("email send failure does not block auth operation", async () => {
    const dbPath = await createDbPath();
    await setupBase(dbPath);
    process.env.APPCTL_DB_FILE = dbPath;
    process.env.APPCTL_ENV = "local";
    fakeEmail.nextResult = { ok: false, error: "service down" };
    setTransactionalEmailPort(fakeEmail);

    // Register should still succeed
    const regResponse = await postRegister(
      new Request("http://localhost:3000/api/v1/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json", origin: "http://localhost:3000" },
        body: JSON.stringify({ email: "fail-email@example.com", password: "Password123!" }),
      }),
    );
    expect(regResponse.status).toBe(201);

    // Password reset should still succeed
    fakeEmail.sentMessages = [];
    const resetResponse = await postPasswordResetRequest(
      new Request("http://localhost:3000/api/v1/auth/password-reset/request", {
        method: "POST",
        headers: { "content-type": "application/json", origin: "http://localhost:3000" },
        body: JSON.stringify({ email: "fail-email@example.com" }),
      }),
    );
    expect(resetResponse.status).toBe(202);

    // Token is still returned in local env
    const body = (await resetResponse.json()) as { accepted: boolean; reset_token?: string };
    expect(body.accepted).toBe(true);
    expect(body.reset_token).toBeTruthy();
  });
});
