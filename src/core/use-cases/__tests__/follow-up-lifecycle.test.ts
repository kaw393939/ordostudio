import { describe, expect, it } from "vitest";

import { InvalidInputError } from "../../domain/errors";
import {
  classifyReminderType,
  normalizeFollowUpDueAt,
  parseFollowUpStatus,
  transitionFollowUpStatus,
} from "../follow-up-lifecycle";

describe("follow-up lifecycle", () => {
  it("parses valid statuses", () => {
    expect(parseFollowUpStatus("open")).toBe("OPEN");
    expect(parseFollowUpStatus("IN_PROGRESS")).toBe("IN_PROGRESS");
    expect(parseFollowUpStatus("done")).toBe("DONE");
    expect(parseFollowUpStatus("BLOCKED")).toBe("BLOCKED");
  });

  it("rejects invalid statuses", () => {
    expect(() => parseFollowUpStatus("CLOSED")).toThrowError(InvalidInputError);
  });

  it("enforces transition guards", () => {
    expect(transitionFollowUpStatus("OPEN", "IN_PROGRESS")).toBe("IN_PROGRESS");
    expect(transitionFollowUpStatus("IN_PROGRESS", "DONE")).toBe("DONE");
    expect(() => transitionFollowUpStatus("DONE", "OPEN")).toThrowError(InvalidInputError);
  });

  it("normalizes due timestamps", () => {
    expect(normalizeFollowUpDueAt("2026-12-20T00:00:00.000Z")).toBe("2026-12-20T00:00:00.000Z");
    expect(normalizeFollowUpDueAt(" ")).toBeNull();
    expect(() => normalizeFollowUpDueAt("bad-date")).toThrowError(InvalidInputError);
  });

  it("classifies reminder type by due windows", () => {
    const now = "2026-10-01T12:00:00.000Z";
    expect(classifyReminderType("2026-10-01T11:00:00.000Z", now)).toBe("OVERDUE");
    expect(classifyReminderType("2026-10-02T00:00:00.000Z", now)).toBe("UPCOMING");
    expect(classifyReminderType("2026-10-10T00:00:00.000Z", now)).toBeNull();
  });
});
