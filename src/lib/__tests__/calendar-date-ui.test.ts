import { describe, expect, it } from "vitest";
import {
  formatEventTimeContext,
  isDiscoveryView,
  shiftMonthKey,
  toAgendaGroups,
  toCalendarMonthGrid,
} from "../calendar-date-ui";
import type { EventListItemViewModel } from "../view-models/events";

const sampleEvents: EventListItemViewModel[] = [
  {
    id: "1",
    slug: "alpha",
    title: "Alpha",
    status: "PUBLISHED",
    statusLabel: "Published",
    startAt: "2026-09-01T10:00:00.000Z",
    endAt: "2026-09-01T11:00:00.000Z",
    timezone: "UTC",
    detailHref: "/events/alpha",
  },
  {
    id: "2",
    slug: "beta",
    title: "Beta",
    status: "PUBLISHED",
    statusLabel: "Published",
    startAt: "2026-09-03T14:00:00.000Z",
    endAt: "2026-09-03T15:00:00.000Z",
    timezone: "UTC",
    detailHref: "/events/beta",
  },
];

describe("calendar/date ui helpers", () => {
  it("validates discovery views", () => {
    expect(isDiscoveryView("list")).toBe(true);
    expect(isDiscoveryView("month")).toBe(true);
    expect(isDiscoveryView("agenda")).toBe(true);
    expect(isDiscoveryView("cards")).toBe(false);
  });

  it("builds month grid with event coverage", () => {
    const month = toCalendarMonthGrid(sampleEvents, "2026-09");
    expect(month.monthKey).toBe("2026-09");
    expect(month.weeks.length).toBeGreaterThan(3);

    const allCells = month.weeks.flat();
    const firstDayCell = allCells.find((cell) => cell.dateKey === "2026-09-01");
    const thirdDayCell = allCells.find((cell) => cell.dateKey === "2026-09-03");

    expect(firstDayCell?.items.map((item) => item.slug)).toEqual(["alpha"]);
    expect(thirdDayCell?.items.map((item) => item.slug)).toEqual(["beta"]);
  });

  it("groups events by date for agenda view", () => {
    const groups = toAgendaGroups(sampleEvents);
    expect(groups).toHaveLength(2);
    expect(groups[0].dateKey).toBe("2026-09-01");
    expect(groups[1].dateKey).toBe("2026-09-03");
  });

  it("formats event and local timezone context", () => {
    const context = formatEventTimeContext(sampleEvents[0]);
    expect(context.eventRange).toContain("Sep 1");
    expect(context.localRange).toContain("Sep 1");
    expect(context.eventTimezone).toBe("UTC");
    expect(context.localTimezone.length).toBeGreaterThan(0);
  });

  it("shifts month key by offset", () => {
    expect(shiftMonthKey("2026-09", 1)).toBe("2026-10");
    expect(shiftMonthKey("2026-01", -1)).toBe("2025-12");
  });
});
