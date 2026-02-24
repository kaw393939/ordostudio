import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";

import { GET as getFeed } from "../feed/route";
import { POST as postRegister } from "../../auth/register/route";
import { POST as postLogin } from "../../auth/login/route";
import { runCli } from "../../../../../cli/run-cli";
import { CliIo } from "../../../../../cli/types";

const tempDirs: string[] = [];

const createDbPath = async (): Promise<string> => {
  const directory = await mkdtemp(join(tmpdir(), "appctl-api-feed-test-"));
  tempDirs.push(directory);
  return join(directory, "app.db");
};

const createIo = (): { io: CliIo; stdout: string[]; stderr: string[] } => {
  const stdout: string[] = [];
  const stderr: string[] = [];

  return {
    io: {
      writeStdout: (message: string) => {
        stdout.push(message);
      },
      writeStderr: (message: string) => {
        stderr.push(message);
      },
      prompt: async () => "",
      promptPassword: async () => "",
    },
    stdout,
    stderr,
  };
};

afterEach(async () => {
  for (const dir of tempDirs) {
    await rm(dir, { recursive: true, force: true });
  }
  tempDirs.length = 0;
});

describe("GET /api/v1/me/feed", () => {
  it("returns 401 if not authenticated", async () => {
    const dbPath = await createDbPath();
    process.env.APPCTL_DB_PATH = dbPath;

    const request = new Request("http://localhost:3000/api/v1/me/feed");
    const response = await getFeed(request);

    expect(response.status).toBe(401);
  });

  it("returns 200 with empty feed for new user", async () => {
    const dbPath = await createDbPath();
    process.env.APPCTL_DB_PATH = dbPath;

    const { io } = createIo();
    await runCli(["db", "init"], io);

    // Register a user
    const email = `test-${Date.now()}@example.com`;
    const registerRequest = new Request("http://localhost:3000/api/v1/auth/register", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Origin": "http://localhost:3000"
      },
      body: JSON.stringify({
        email: email,
        password: "Password123!",
        terms_accepted: true,
      }),
    });
    const registerResponse = await postRegister(registerRequest);
    expect(registerResponse.status).toBe(201);

    // Login
    const loginRequest = new Request("http://localhost:3000/api/v1/auth/login", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Origin": "http://localhost:3000"
      },
      body: JSON.stringify({
        email: email,
        password: "Password123!",
      }),
    });
    const loginResponse = await postLogin(loginRequest);
    expect(loginResponse.status).toBe(200);
    const cookie = (loginResponse.headers.get("set-cookie") || "").split(";")[0];

    // Get feed
    const feedRequest = new Request("http://localhost:3000/api/v1/me/feed", {
      headers: { cookie },
    });
    const feedResponse = await getFeed(feedRequest);

    expect(feedResponse.status).toBe(200);
    const data = await feedResponse.json() as { count?: number; items?: unknown[] };
    console.log("FEED RESPONSE DATA:", data);
    expect(data.count).toBe(0);
    expect(data.items).toEqual([]);
  });
});
