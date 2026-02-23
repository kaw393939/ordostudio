import { describe, expect, it } from "vitest";

import { InvalidInputError } from "../../domain/errors";
import {
  normalizeEngagementOutcomeInput,
  parseEngagementSessionStatus,
  sortEngagementTimeline,
} from "../engagement-outcomes";

describe("engagement outcomes use-cases", () => {
  it("accepts valid status values", () => {
    expect(parseEngagementSessionStatus("planned")).toBe("PLANNED");
    expect(parseEngagementSessionStatus("DELIVERED")).toBe("DELIVERED");
    expect(parseEngagementSessionStatus(undefined)).toBe("DELIVERED");
  });

  it("rejects invalid status values", () => {
    expect(() => parseEngagementSessionStatus("closed")).toThrowError(InvalidInputError);
  });

  it("requires at least one outcome signal", () => {
    expect(() => normalizeEngagementOutcomeInput({ outcomes: [], actionItems: [], nextStep: "" })).toThrowError(
      InvalidInputError,
    );

    expect(
      normalizeEngagementOutcomeInput({
        outcomes: ["  Increased confidence  ", ""],
        actionItems: [{ description: "Schedule debrief", dueAt: "2026-12-01T00:00:00.000Z" }],
        nextStep: "Send recap",
      }),
    ).toEqual({
      outcomes: ["Increased confidence"],
      actionItems: [{ description: "Schedule debrief", dueAt: "2026-12-01T00:00:00.000Z" }],
      nextStep: "Send recap",
    });
  });

  it("rejects invalid action-item due dates", () => {
    expect(() =>
      normalizeEngagementOutcomeInput({
        actionItems: [{ description: "Follow-up", dueAt: "not-a-date" }],
      }),
    ).toThrowError(InvalidInputError);
  });

  it("orders timeline descending by start time", () => {
    const sorted = sortEngagementTimeline([
      { id: "a", startAt: "2026-09-01T00:00:00.000Z" },
      { id: "b", startAt: "2026-11-01T00:00:00.000Z" },
      { id: "c", startAt: "2026-10-01T00:00:00.000Z" },
    ]);

    expect(sorted.map((item) => item.id)).toEqual(["b", "c", "a"]);
  });
});
