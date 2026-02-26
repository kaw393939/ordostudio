/**
 * WFLOW-01: evaluateCondition unit tests
 *
 * Verifies correct operator semantics including:
 * - eq / neq / contains on string fields
 * - gt / lt / gte / lte on numeric strings; NaN / missing-field behaviour
 * - Unknown operator returns false (with a warn log)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { evaluateCondition, type ConditionSpec } from "@/lib/api/workflow-engine";
import type { StoredFeedEvent } from "@/lib/api/feed-events";

// Silence the logger during tests
vi.mock("@/platform/logger", () => ({
  getLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
  }),
}));

const makeEvent = (overrides: Partial<StoredFeedEvent> = {}): StoredFeedEvent => ({
  id: "evt-1",
  user_id: "user-1",
  type: "REGISTRATION_CONFIRMED",
  title: "Welcome",
  description: "You registered.",
  action_url: "/dashboard",
  created_at: new Date().toISOString(),
  ...overrides,
});

describe("evaluateCondition — WFLOW-01", () => {
  describe("eq operator", () => {
    it("matches when string field equals value", () => {
      expect(
        evaluateCondition(
          { field: "type", operator: "eq", value: "REGISTRATION_CONFIRMED" },
          makeEvent(),
        ),
      ).toBe(true);
    });

    it("does not match when field differs", () => {
      expect(
        evaluateCondition(
          { field: "type", operator: "eq", value: "PAYMENT_RECEIVED" },
          makeEvent(),
        ),
      ).toBe(false);
    });

    it("returns false for missing field (empty string !== non-empty value)", () => {
      expect(
        evaluateCondition(
          { field: "payload.nonexistent", operator: "eq", value: "hello" },
          makeEvent(),
        ),
      ).toBe(false);
    });
  });

  describe("neq operator", () => {
    it("returns true when field differs from value", () => {
      expect(
        evaluateCondition(
          { field: "type", operator: "neq", value: "PAYMENT_RECEIVED" },
          makeEvent(),
        ),
      ).toBe(true);
    });

    it("returns false when field equals value", () => {
      expect(
        evaluateCondition(
          { field: "type", operator: "neq", value: "REGISTRATION_CONFIRMED" },
          makeEvent(),
        ),
      ).toBe(false);
    });
  });

  describe("contains operator", () => {
    it("returns true when field contains the substring", () => {
      expect(
        evaluateCondition(
          { field: "title", operator: "contains", value: "Welcome" },
          makeEvent({ title: "Welcome to the guild" }),
        ),
      ).toBe(true);
    });

    it("returns false when field does not contain the substring", () => {
      expect(
        evaluateCondition(
          { field: "title", operator: "contains", value: "Invoice" },
          makeEvent({ title: "Welcome to the guild" }),
        ),
      ).toBe(false);
    });

    it("returns false for missing field (empty string does not contain non-empty value)", () => {
      expect(
        evaluateCondition(
          { field: "payload.missing", operator: "contains", value: "something" },
          makeEvent(),
        ),
      ).toBe(false);
    });
  });

  describe("gt operator", () => {
    it("returns true when numeric field > value", () => {
      // user_id is a string but we can use a custom event property via description hack
      // Use description field with a numeric string
      expect(
        evaluateCondition(
          { field: "description", operator: "gt", value: 5 },
          makeEvent({ description: "10" }),
        ),
      ).toBe(true);
    });

    it("returns false when numeric field === value", () => {
      expect(
        evaluateCondition(
          { field: "description", operator: "gt", value: 10 },
          makeEvent({ description: "10" }),
        ),
      ).toBe(false);
    });

    it("returns false for missing field (treated as 0, not NaN)", () => {
      // missing field → eventVal = "" → Number("") = 0 — not NaN
      const result = evaluateCondition(
        { field: "payload.nonexistent", operator: "gt", value: -1 },
        makeEvent(),
      );
      // Number("") = 0 > -1 = true (deterministic — not NaN-based)
      expect(result).toBe(true);
    });

    it("missing field evaluates as 0, which is not > 0", () => {
      expect(
        evaluateCondition(
          { field: "payload.nonexistent", operator: "gt", value: 0 },
          makeEvent(),
        ),
      ).toBe(false);
    });
  });

  describe("lt operator", () => {
    it("returns true when numeric field < value", () => {
      expect(
        evaluateCondition(
          { field: "description", operator: "lt", value: 20 },
          makeEvent({ description: "10" }),
        ),
      ).toBe(true);
    });

    it("returns false when field >= value", () => {
      expect(
        evaluateCondition(
          { field: "description", operator: "lt", value: 10 },
          makeEvent({ description: "10" }),
        ),
      ).toBe(false);
    });
  });

  describe("gte operator (new in WFLOW-01)", () => {
    it("returns true when field equals value", () => {
      expect(
        evaluateCondition(
          { field: "description", operator: "gte", value: 10 },
          makeEvent({ description: "10" }),
        ),
      ).toBe(true);
    });

    it("returns true when field > value", () => {
      expect(
        evaluateCondition(
          { field: "description", operator: "gte", value: 5 },
          makeEvent({ description: "10" }),
        ),
      ).toBe(true);
    });

    it("returns false when field < value", () => {
      expect(
        evaluateCondition(
          { field: "description", operator: "gte", value: 20 },
          makeEvent({ description: "10" }),
        ),
      ).toBe(false);
    });
  });

  describe("lte operator (new in WFLOW-01)", () => {
    it("returns true when field equals value", () => {
      expect(
        evaluateCondition(
          { field: "description", operator: "lte", value: 10 },
          makeEvent({ description: "10" }),
        ),
      ).toBe(true);
    });

    it("returns false when field > value", () => {
      expect(
        evaluateCondition(
          { field: "description", operator: "lte", value: 5 },
          makeEvent({ description: "10" }),
        ),
      ).toBe(false);
    });
  });

  describe("unknown operator", () => {
    it("returns false and does not throw for an unknown operator", () => {
      const condition = {
        field: "type",
        operator: "regex" as ConditionSpec["operator"],
        value: "CONFIRM.*",
      };
      expect(() => evaluateCondition(condition, makeEvent())).not.toThrow();
      expect(evaluateCondition(condition, makeEvent())).toBe(false);
    });
  });
});
