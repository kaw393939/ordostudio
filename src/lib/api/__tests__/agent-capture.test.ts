import { describe, it, expect } from "vitest";
import { extractCapturedValues } from "@/lib/api/agent-capture";

describe("extractCapturedValues", () => {
  it("captures intake_request_id from submit_intake result", () => {
    const captured: Record<string, unknown> = {};
    extractCapturedValues("submit_intake", { intake_request_id: "req-abc" }, captured);
    expect(captured.intake_request_id).toBe("req-abc");
  });

  it("captures booking_id from create_booking result", () => {
    const captured: Record<string, unknown> = {};
    extractCapturedValues("create_booking", { booking_id: "book-xyz" }, captured);
    expect(captured.booking_id).toBe("book-xyz");
  });

  it("does not mutate capturedValues for an unknown tool", () => {
    const captured: Record<string, unknown> = {};
    extractCapturedValues("content_search", { intake_request_id: "should-not-capture" }, captured);
    expect(Object.keys(captured)).toHaveLength(0);
  });

  it("does not capture when the expected key is absent", () => {
    const captured: Record<string, unknown> = {};
    extractCapturedValues("submit_intake", { status: "ok" }, captured);
    expect(captured.intake_request_id).toBeUndefined();
  });

  it("does not throw and does not mutate for null result", () => {
    const captured: Record<string, unknown> = {};
    expect(() => extractCapturedValues("submit_intake", null, captured)).not.toThrow();
    expect(Object.keys(captured)).toHaveLength(0);
  });

  it("does not throw and does not mutate for non-object result", () => {
    const captured: Record<string, unknown> = {};
    expect(() => extractCapturedValues("submit_intake", "some string", captured)).not.toThrow();
    expect(Object.keys(captured)).toHaveLength(0);
  });

  it("does not overwrite an existing captured value with a different tool", () => {
    const captured: Record<string, unknown> = { intake_request_id: "original" };
    extractCapturedValues("create_booking", { booking_id: "book-1" }, captured);
    expect(captured.intake_request_id).toBe("original");
    expect(captured.booking_id).toBe("book-1");
  });

  it("captures from create_booking even when intake_request_id is already set", () => {
    const captured: Record<string, unknown> = { intake_request_id: "req-1" };
    extractCapturedValues("create_booking", { booking_id: "book-2", status: "PENDING" }, captured);
    expect(captured.intake_request_id).toBe("req-1");
    expect(captured.booking_id).toBe("book-2");
  });
});
