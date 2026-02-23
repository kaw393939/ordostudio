import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { withRequestLogging } from "../request-logging";
import { FakeErrorReporter } from "../../../core/ports/__tests__/fake-error-reporter";
import { setErrorReporter, resetErrorReporter } from "../../../platform/error-reporter";
import { setLogger, resetLogger } from "../../../platform/logger";
import pino from "pino";
import { Writable } from "node:stream";

/* ── helpers ───────────────────────────────────────── */

function buildRequest(method: string, path: string): Request {
  return new Request(`http://localhost:3000${path}`, { method });
}

const dummyContext = { params: Promise.resolve({}) };

function createCapturingLogger() {
  const lines: Record<string, unknown>[] = [];
  const dest = new Writable({
    write(chunk, _enc, cb) {
      lines.push(JSON.parse(chunk.toString()));
      cb();
    },
  });
  const logger = pino({ level: "trace" }, dest);
  return { logger, lines };
}

/* ── tests ─────────────────────────────────────────── */

describe("withRequestLogging()", () => {
  let fakeReporter: FakeErrorReporter;
  let logLines: Record<string, unknown>[];

  beforeEach(() => {
    fakeReporter = new FakeErrorReporter();
    setErrorReporter(fakeReporter);

    const { logger, lines } = createCapturingLogger();
    logLines = lines;
    setLogger(logger);
  });

  afterEach(() => {
    resetErrorReporter();
    resetLogger();
  });

  it("logs request method and path on entry", async () => {
    const handler = vi.fn(async () => new Response("ok"));
    const wrapped = withRequestLogging(handler);

    await wrapped(buildRequest("GET", "/api/v1/events"), dummyContext);

    const entry = logLines.find((l) => l.msg === "→ request");
    expect(entry).toBeDefined();
    expect(entry!.method).toBe("GET");
    expect(entry!.path).toBe("/api/v1/events");
    expect(entry!.requestId).toBeDefined();
  });

  it("logs status and duration on success", async () => {
    const handler = vi.fn(async () => new Response("ok", { status: 200 }));
    const wrapped = withRequestLogging(handler);

    await wrapped(buildRequest("POST", "/api/v1/users"), dummyContext);

    const exit = logLines.find((l) => l.msg === "← response");
    expect(exit).toBeDefined();
    expect(exit!.status).toBe(200);
    expect(typeof exit!.durationMs).toBe("number");
  });

  it("logs error and duration on failure", async () => {
    const handler = vi.fn(async () => {
      throw new Error("kaboom");
    });
    const wrapped = withRequestLogging(handler);

    const response = await wrapped(
      buildRequest("DELETE", "/api/v1/events/test"),
      dummyContext,
    );

    const errLine = logLines.find((l) => l.msg === "✗ unhandled error");
    expect(errLine).toBeDefined();
    expect(typeof errLine!.durationMs).toBe("number");
    expect(response.status).toBe(500);
  });

  it("returns 500 problem+json on unhandled error", async () => {
    const handler = vi.fn(async () => {
      throw new Error("unexpected");
    });
    const wrapped = withRequestLogging(handler);

    const response = await wrapped(
      buildRequest("POST", "/api/v1/events"),
      dummyContext,
    );

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.type).toBe("https://lms-219.dev/problems/internal");
    expect(body.title).toBe("Internal Server Error");
  });

  it("calls error reporter on unhandled error", async () => {
    const handler = vi.fn(async () => {
      throw new Error("report-me");
    });
    const wrapped = withRequestLogging(handler);

    await wrapped(buildRequest("POST", "/api/v1/events"), dummyContext);

    expect(fakeReporter.exceptions).toHaveLength(1);
    expect((fakeReporter.exceptions[0].error as Error).message).toBe("report-me");
    expect(fakeReporter.exceptions[0].context?.requestId).toBeDefined();
  });

  it("logs server error for 5xx responses from handler", async () => {
    const handler = vi.fn(
      async () =>
        new Response("fail", { status: 500 }),
    );
    const wrapped = withRequestLogging(handler);

    await wrapped(buildRequest("GET", "/api/v1/test"), dummyContext);

    const errLine = logLines.find(
      (l) => l.msg === "← server error response",
    );
    expect(errLine).toBeDefined();
    expect(errLine!.status).toBe(500);
  });

  it("injects x-request-id header into response", async () => {
    const handler = vi.fn(async () => new Response("ok"));
    const wrapped = withRequestLogging(handler);

    const response = await wrapped(
      buildRequest("GET", "/api/v1/events"),
      dummyContext,
    );

    expect(response.headers.get("x-request-id")).toBeDefined();
  });

  it("preserves existing x-request-id if already set", async () => {
    const handler = vi.fn(async () => {
      return new Response("ok", {
        headers: { "x-request-id": "existing-id" },
      });
    });
    const wrapped = withRequestLogging(handler);

    const response = await wrapped(
      buildRequest("GET", "/api/v1/events"),
      dummyContext,
    );

    expect(response.headers.get("x-request-id")).toBe("existing-id");
  });

  it("entry and exit log lines share the same requestId", async () => {
    const handler = vi.fn(async () => new Response("ok"));
    const wrapped = withRequestLogging(handler);

    await wrapped(buildRequest("GET", "/api/v1/events"), dummyContext);

    const entry = logLines.find((l) => l.msg === "→ request");
    const exit = logLines.find((l) => l.msg === "← response");

    expect(entry!.requestId).toBeDefined();
    expect(entry!.requestId).toBe(exit!.requestId);
  });
});
