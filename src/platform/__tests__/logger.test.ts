import { describe, it, expect, afterEach, vi } from "vitest";
import pino from "pino";
import { Writable } from "node:stream";
import {
  createLogger,
  getRequestLogger,
  setLogger,
  resetLogger,
  getLogger,
} from "../logger";

describe("platform/logger", () => {
  afterEach(() => {
    resetLogger();
    vi.unstubAllEnvs();
  });

  describe("createLogger()", () => {
    it("returns a pino Logger instance", () => {
      const log = createLogger();
      expect(typeof log.info).toBe("function");
      expect(typeof log.error).toBe("function");
      expect(typeof log.warn).toBe("function");
      expect(typeof log.debug).toBe("function");
    });

    it("defaults to level 'info'", () => {
      const log = createLogger();
      expect(log.level).toBe("info");
    });

    it("respects LOG_LEVEL env var", () => {
      vi.stubEnv("LOG_LEVEL", "debug");
      const log = createLogger();
      expect(log.level).toBe("debug");
    });

    it("options.level overrides env var", () => {
      vi.stubEnv("LOG_LEVEL", "debug");
      const log = createLogger({ level: "warn" });
      expect(log.level).toBe("warn");
    });

    it("accepts an optional name", () => {
      const log = createLogger({ name: "test-app" });
      expect(log).toBeDefined();
    });
  });

  describe("getRequestLogger()", () => {
    it("produces a child logger with requestId", () => {
      // Write logs to a buffer to verify requestId appears
      const chunks: string[] = [];
      const dest = new Writable({
        write(chunk, _enc, cb) {
          chunks.push(chunk.toString());
          cb();
        },
      });

      const base = pino({ level: "info" }, dest);
      const child = getRequestLogger("abc-123", base);

      child.info("hello");

      // pino writes synchronously with default dest
      expect(chunks.length).toBeGreaterThan(0);
      const parsed = JSON.parse(chunks[0]);
      expect(parsed.requestId).toBe("abc-123");
      expect(parsed.msg).toBe("hello");
    });

    it("uses default logger when no base provided", () => {
      // Should not throw
      const child = getRequestLogger("req-456");
      expect(typeof child.info).toBe("function");
    });
  });

  describe("setLogger / resetLogger / getLogger", () => {
    it("overrides the default logger", () => {
      const custom = createLogger({ level: "trace" });
      setLogger(custom);
      const current = getLogger();
      expect(current.level).toBe("trace");
    });

    it("resetLogger restores env-based default", () => {
      const custom = createLogger({ level: "trace" });
      setLogger(custom);
      resetLogger();
      const current = getLogger();
      expect(current.level).toBe("info");
    });
  });
});
