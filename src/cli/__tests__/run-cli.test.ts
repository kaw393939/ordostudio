import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { resolveConfig } from "../config";
import { mapErrorToExitCode, runCli } from "../run-cli";
import { CliIo } from "../types";

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
    },
    stdout,
    stderr,
  };
};

const tempDirs: string[] = [];

const createDbPath = async (): Promise<string> => {
  const directory = await mkdtemp(join(tmpdir(), "appctl-test-"));
  tempDirs.push(directory);
  return join(directory, "app.db");
};

const runWithDb = async (
  argv: string[],
  dbPath: string,
): Promise<{ exitCode: number; stdout: string; stderr: string }> => {
  const { io, stdout, stderr } = createIo();
  const previousDbPath = process.env.APPCTL_DB_FILE;

  process.env.APPCTL_DB_FILE = dbPath;
  const exitCode = await runCli(argv, io);

  if (previousDbPath === undefined) {
    delete process.env.APPCTL_DB_FILE;
  } else {
    process.env.APPCTL_DB_FILE = previousDbPath;
  }

  return {
    exitCode,
    stdout: stdout.join(""),
    stderr: stderr.join(""),
  };
};

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("appctl foundation", () => {
  it("matches help snapshot", async () => {
    const { io, stdout } = createIo();
    const exitCode = await runCli(["--help"], io);

    expect(exitCode).toBe(0);
    expect(stdout.join("")).toMatchSnapshot();
  });

  it("returns JSON envelope for doctor", async () => {
    const dbPath = await createDbPath();
    await runWithDb(["db", "migrate"], dbPath);

    const { exitCode, stdout } = await runWithDb(["--json", "--env", "local", "doctor"], dbPath);

    expect(exitCode).toBe(0);

    const payload = JSON.parse(stdout);
    expect(payload).toMatchObject({
      ok: true,
      command: "doctor",
      env: "local",
      warnings: [],
      errors: [],
    });
    expect(typeof payload.request_id).toBe("string");
  });

  it("applies config precedence flags > env > file > defaults", () => {
    const config = resolveConfig({
      fileConfig: {
        env: "staging",
        output: {
          defaultFormat: "text",
        },
      },
      envVars: {
        APPCTL_ENV: "prod",
        APPCTL_OUTPUT_FORMAT: "text",
      },
      flags: {
        env: "local",
        json: true,
      },
    });

    expect(config.env).toBe("local");
    expect(config.output.defaultFormat).toBe("json");
  });

  it("returns usage error exit code 2 for invalid env", async () => {
    const { io } = createIo();
    const exitCode = await runCli(["--env", "qa", "doctor"], io);

    expect(exitCode).toBe(2);
  });

  it("maps unexpected errors to exit code 1", () => {
    expect(mapErrorToExitCode(new Error("boom"))).toBe(1);
  });
});

