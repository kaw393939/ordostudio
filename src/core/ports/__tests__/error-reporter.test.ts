import { describe, it, expect, beforeEach } from "vitest";
import {
  FakeErrorReporter,
} from "./fake-error-reporter";

describe("FakeErrorReporter", () => {
  let reporter: FakeErrorReporter;

  beforeEach(() => {
    reporter = new FakeErrorReporter();
  });

  it("records captured exceptions", () => {
    const err = new Error("boom");
    reporter.captureException(err, { requestId: "r-1" });

    expect(reporter.exceptions).toHaveLength(1);
    expect(reporter.exceptions[0].error).toBe(err);
    expect(reporter.exceptions[0].context).toEqual({ requestId: "r-1" });
  });

  it("records captured messages", () => {
    reporter.captureMessage("degraded state", "warning", { service: "db" });

    expect(reporter.messages).toHaveLength(1);
    expect(reporter.messages[0].message).toBe("degraded state");
    expect(reporter.messages[0].level).toBe("warning");
    expect(reporter.messages[0].context).toEqual({ service: "db" });
  });

  it("tracks all entries in order", () => {
    reporter.captureException(new Error("e1"));
    reporter.captureMessage("m1", "info");
    reporter.captureException(new Error("e2"));

    expect(reporter.entries).toHaveLength(3);
    expect(reporter.entries[0].kind).toBe("exception");
    expect(reporter.entries[1].kind).toBe("message");
    expect(reporter.entries[2].kind).toBe("exception");
  });

  it("reset clears all entries", () => {
    reporter.captureException(new Error("e1"));
    reporter.captureMessage("m1", "error");

    reporter.reset();

    expect(reporter.entries).toHaveLength(0);
    expect(reporter.exceptions).toHaveLength(0);
    expect(reporter.messages).toHaveLength(0);
  });

  it("handles exceptions without context", () => {
    reporter.captureException("string-error");

    expect(reporter.exceptions[0].error).toBe("string-error");
    expect(reporter.exceptions[0].context).toBeUndefined();
  });
});
