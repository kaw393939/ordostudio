import { describe, expect, it } from "vitest";

import { addDaysIso, detectConflicts, overlaps, roundToStepMinutes, type SchedulableEvent } from "@/lib/admin-scheduling";

describe("Sprint 50: admin scheduling helpers", () => {
  it("overlaps returns true for intersecting ranges", () => {
    expect(overlaps("2026-02-19T10:00:00.000Z", "2026-02-19T11:00:00.000Z", "2026-02-19T10:30:00.000Z", "2026-02-19T12:00:00.000Z")).toBe(true);
    expect(overlaps("2026-02-19T10:00:00.000Z", "2026-02-19T11:00:00.000Z", "2026-02-19T11:00:00.000Z", "2026-02-19T12:00:00.000Z")).toBe(false);
  });

  it("detects location and instructor conflicts", () => {
    const moving: SchedulableEvent = {
      id: "evt_1",
      slug: "a",
      title: "A",
      startAt: "2026-02-19T10:00:00.000Z",
      endAt: "2026-02-19T11:00:00.000Z",
      timezone: "UTC",
      locationText: "Room 1",
      instructorId: "ins_1",
    };

    const other1: SchedulableEvent = {
      id: "evt_2",
      slug: "b",
      title: "B",
      startAt: "2026-02-19T10:30:00.000Z",
      endAt: "2026-02-19T11:30:00.000Z",
      timezone: "UTC",
      locationText: "Room 1",
      instructorId: "ins_2",
    };

    const other2: SchedulableEvent = {
      id: "evt_3",
      slug: "c",
      title: "C",
      startAt: "2026-02-19T10:15:00.000Z",
      endAt: "2026-02-19T10:45:00.000Z",
      timezone: "UTC",
      locationText: "Room 2",
      instructorId: "ins_1",
    };

    const conflicts = detectConflicts({
      events: [moving, other1, other2],
      moving,
      nextStartAt: moving.startAt,
      nextEndAt: moving.endAt,
    });

    expect(conflicts.some((c) => c.type === "location")).toBe(true);
    expect(conflicts.some((c) => c.type === "instructor")).toBe(true);
  });

  it("addDaysIso offsets by whole days", () => {
    expect(addDaysIso("2026-02-19T10:00:00.000Z", 7)).toBe("2026-02-26T10:00:00.000Z");
  });

  it("roundToStepMinutes rounds to step", () => {
    expect(roundToStepMinutes(62, 30)).toBe(60);
    expect(roundToStepMinutes(76, 30)).toBe(90);
  });
});
