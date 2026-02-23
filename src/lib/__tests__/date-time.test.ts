import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  nowISO,
  parseISO,
  isValidISO,
  toUTC,
  toLocal,
  formatAbsolute,
  formatRelative,
  formatCompact,
  formatDate,
  formatTime,
  formatDateTime,
  nextBusinessDay,
  roundToQuarter,
  addDays,
  addHours,
  getLocalTimezone,
  defaultEventStart,
  defaultFollowUpDue,
} from "@/lib/date-time";

/* ------------------------------------------------------------------ */
/*  parseISO / isValidISO                                             */
/* ------------------------------------------------------------------ */
describe("parseISO", () => {
  it("parses a valid UTC ISO string", () => {
    const d = parseISO("2026-03-14T09:00:00Z");
    expect(d).toBeInstanceOf(Date);
    expect(d.toISOString()).toBe("2026-03-14T09:00:00.000Z");
  });

  it("parses an ISO string with milliseconds", () => {
    const d = parseISO("2026-03-14T09:00:00.123Z");
    expect(d.getUTCMilliseconds()).toBe(123);
  });

  it("throws on invalid string", () => {
    expect(() => parseISO("not-a-date")).toThrow();
  });

  it("throws on empty string", () => {
    expect(() => parseISO("")).toThrow();
  });

  it("throws on partial date", () => {
    expect(() => parseISO("2026-13-01T00:00:00Z")).toThrow();
  });
});

describe("isValidISO", () => {
  it("returns true for valid ISO string", () => {
    expect(isValidISO("2026-03-14T09:00:00Z")).toBe(true);
  });

  it("returns false for garbage", () => {
    expect(isValidISO("nope")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isValidISO("")).toBe(false);
  });
});

/* ------------------------------------------------------------------ */
/*  nowISO                                                            */
/* ------------------------------------------------------------------ */
describe("nowISO", () => {
  it("returns a valid ISO string", () => {
    const iso = nowISO();
    expect(isValidISO(iso)).toBe(true);
  });

  it("returns current time within 1 second", () => {
    const before = Date.now();
    const iso = nowISO();
    const after = Date.now();
    const ts = new Date(iso).getTime();
    expect(ts).toBeGreaterThanOrEqual(before);
    expect(ts).toBeLessThanOrEqual(after);
  });
});

/* ------------------------------------------------------------------ */
/*  toUTC / toLocal round-trips                                       */
/* ------------------------------------------------------------------ */
describe("toUTC / toLocal round-trips", () => {
  it("round-trips through America/New_York", () => {
    const utc = "2026-03-14T13:00:00.000Z"; // 9 AM ET (EDT)
    const local = toLocal(utc, "America/New_York");
    const backToUtc = toUTC(local, "America/New_York");
    expect(backToUtc).toBe(utc);
  });

  it("round-trips through Asia/Tokyo (UTC+9, no DST)", () => {
    const utc = "2026-06-15T03:00:00.000Z"; // 12:00 PM JST
    const local = toLocal(utc, "Asia/Tokyo");
    const backToUtc = toUTC(local, "Asia/Tokyo");
    expect(backToUtc).toBe(utc);
  });

  it("round-trips through Europe/London (BST, UTC+1)", () => {
    const utc = "2026-07-01T11:00:00.000Z"; // 12:00 PM BST
    const local = toLocal(utc, "Europe/London");
    const backToUtc = toUTC(local, "Europe/London");
    expect(backToUtc).toBe(utc);
  });

  it("round-trips through Australia/Sydney (AEDT UTC+11)", () => {
    const utc = "2026-01-15T01:00:00.000Z"; // 12:00 PM AEDT
    const local = toLocal(utc, "Australia/Sydney");
    const backToUtc = toUTC(local, "Australia/Sydney");
    expect(backToUtc).toBe(utc);
  });

  it("round-trips through Pacific/Honolulu (HST UTC-10, no DST)", () => {
    const utc = "2026-08-20T22:00:00.000Z"; // 12:00 PM HST
    const local = toLocal(utc, "Pacific/Honolulu");
    const backToUtc = toUTC(local, "Pacific/Honolulu");
    expect(backToUtc).toBe(utc);
  });
});

/* ------------------------------------------------------------------ */
/*  DST boundary tests                                                */
/* ------------------------------------------------------------------ */
describe("DST boundaries", () => {
  // 2026 US spring-forward: Mar 8, 2:00 AM → 3:00 AM ET
  it("handles spring-forward (America/New_York 2026-03-08)", () => {
    // 1:30 AM EST = UTC 6:30
    const preSpring = "2026-03-08T06:30:00.000Z";
    const local = toLocal(preSpring, "America/New_York");
    expect(local.getHours()).toBe(1);
    expect(local.getMinutes()).toBe(30);

    // 3:30 AM EDT = UTC 7:30
    const postSpring = "2026-03-08T07:30:00.000Z";
    const local2 = toLocal(postSpring, "America/New_York");
    expect(local2.getHours()).toBe(3);
    expect(local2.getMinutes()).toBe(30);
  });

  // 2026 US fall-back: Nov 1, 2:00 AM → 1:00 AM ET
  it("handles fall-back (America/New_York 2026-11-01)", () => {
    // 1:30 AM EDT (first occurrence) = UTC 5:30
    const preFall = "2026-11-01T05:30:00.000Z";
    const local = toLocal(preFall, "America/New_York");
    expect(local.getHours()).toBe(1);

    // 1:30 AM EST (second occurrence) = UTC 6:30
    const postFall = "2026-11-01T06:30:00.000Z";
    const local2 = toLocal(postFall, "America/New_York");
    expect(local2.getHours()).toBe(1);
  });

  it("handles leap day (Feb 29)", () => {
    // 2028 is a leap year
    const leapDay = "2028-02-29T12:00:00.000Z";
    const d = parseISO(leapDay);
    expect(d.getUTCDate()).toBe(29);
    expect(d.getUTCMonth()).toBe(1); // 0-indexed
  });

  it("handles year-end boundary", () => {
    const nyeUtc = "2026-12-31T23:30:00.000Z";
    const local = toLocal(nyeUtc, "Asia/Tokyo"); // +9 = Jan 1 8:30 AM
    expect(local.getFullYear()).toBe(2027);
    expect(local.getMonth()).toBe(0);
    expect(local.getDate()).toBe(1);
  });
});

/* ------------------------------------------------------------------ */
/*  formatRelative thresholds                                         */
/* ------------------------------------------------------------------ */
describe("formatRelative", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-15T12:00:00Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows 'just now' for < 1 minute ago", () => {
    expect(formatRelative("2026-06-15T11:59:30Z")).toBe("just now");
  });

  it("shows '1 minute ago' at 1 min", () => {
    expect(formatRelative("2026-06-15T11:59:00Z")).toBe("1 minute ago");
  });

  it("shows '1 hour ago' at 1 hour", () => {
    expect(formatRelative("2026-06-15T11:00:00Z")).toBe("1 hour ago");
  });

  it("shows '1 day ago' at 1 day", () => {
    expect(formatRelative("2026-06-14T12:00:00Z")).toBe("1 day ago");
  });

  it("shows '6 days ago' at 6 days", () => {
    expect(formatRelative("2026-06-09T12:00:00Z")).toBe("6 days ago");
  });

  it("switches to absolute date after 7 days", () => {
    // 7+ days ago falls back to compact date
    const result = formatRelative("2026-06-08T12:00:00Z");
    expect(result).toMatch(/Jun\s+8/);
  });

  it("shows 'in X minutes' for near future", () => {
    expect(formatRelative("2026-06-15T12:05:00Z")).toBe("in 5 minutes");
  });

  it("shows 'in 1 hour' for 1 hour ahead", () => {
    expect(formatRelative("2026-06-15T13:00:00Z")).toBe("in 1 hour");
  });

  it("shows 'in 3 days' for 3 days ahead", () => {
    expect(formatRelative("2026-06-18T12:00:00Z")).toBe("in 3 days");
  });

  it("switches to absolute date after 7 days in future", () => {
    const result = formatRelative("2026-06-22T12:00:00Z");
    expect(result).toMatch(/Jun\s+22/);
  });
});

/* ------------------------------------------------------------------ */
/*  formatAbsolute / formatCompact / formatDate / formatTime          */
/* ------------------------------------------------------------------ */
describe("formatAbsolute", () => {
  it("formats with timezone abbreviation", () => {
    const result = formatAbsolute("2026-03-14T13:00:00Z", "America/New_York");
    // Should contain date, time, and timezone
    expect(result).toMatch(/Mar/);
    expect(result).toMatch(/14/);
    expect(result).toMatch(/9:00/);
    expect(result).toMatch(/AM/);
  });
});

describe("formatCompact", () => {
  it("shows short month and day", () => {
    const result = formatCompact("2026-03-14T13:00:00Z", "America/New_York");
    expect(result).toMatch(/Mar/);
    expect(result).toMatch(/14/);
  });
});

describe("formatDate", () => {
  it("shows full date", () => {
    const result = formatDate("2026-03-14T13:00:00Z", "America/New_York");
    expect(result).toMatch(/March/);
    expect(result).toMatch(/14/);
    expect(result).toMatch(/2026/);
  });
});

describe("formatTime", () => {
  it("shows time with timezone", () => {
    const result = formatTime("2026-03-14T13:00:00Z", "America/New_York");
    expect(result).toMatch(/9:00/);
    expect(result).toMatch(/AM/);
  });
});

describe("formatDateTime", () => {
  it("shows date and time combined", () => {
    const result = formatDateTime("2026-03-14T13:00:00Z", "America/New_York");
    expect(result).toMatch(/Mar/);
    expect(result).toMatch(/14/);
    expect(result).toMatch(/9:00/);
    expect(result).toMatch(/AM/);
  });
});

/* ------------------------------------------------------------------ */
/*  Smart defaults: nextBusinessDay, roundToQuarter                   */
/* ------------------------------------------------------------------ */
describe("nextBusinessDay", () => {
  it("returns Monday when today is Friday", () => {
    // 2026-03-13 is a Friday
    const result = nextBusinessDay(new Date("2026-03-13T12:00:00Z"));
    expect(result.getUTCDay()).toBe(1); // Monday
    expect(result.getUTCDate()).toBe(16);
  });

  it("returns Monday when today is Saturday", () => {
    const result = nextBusinessDay(new Date("2026-03-14T12:00:00Z"));
    expect(result.getUTCDay()).toBe(1);
    expect(result.getUTCDate()).toBe(16);
  });

  it("returns Monday when today is Sunday", () => {
    const result = nextBusinessDay(new Date("2026-03-15T12:00:00Z"));
    expect(result.getUTCDay()).toBe(1);
    expect(result.getUTCDate()).toBe(16);
  });

  it("returns Tuesday when today is Monday", () => {
    const result = nextBusinessDay(new Date("2026-03-16T12:00:00Z"));
    expect(result.getUTCDay()).toBe(2);
    expect(result.getUTCDate()).toBe(17);
  });

  it("returns next day when today is Wednesday", () => {
    const result = nextBusinessDay(new Date("2026-03-18T12:00:00Z"));
    expect(result.getUTCDay()).toBe(4); // Thursday
    expect(result.getUTCDate()).toBe(19);
  });

  it("defaults to today when no argument given", () => {
    const result = nextBusinessDay();
    expect(result).toBeInstanceOf(Date);
    // Should be a weekday (1-5)
    expect(result.getUTCDay()).toBeGreaterThanOrEqual(1);
    expect(result.getUTCDay()).toBeLessThanOrEqual(5);
  });
});

describe("roundToQuarter", () => {
  it("rounds 9:07 → 9:15", () => {
    const d = new Date("2026-03-14T09:07:00Z");
    const r = roundToQuarter(d);
    expect(r.getUTCHours()).toBe(9);
    expect(r.getUTCMinutes()).toBe(15);
  });

  it("rounds 9:00 → 9:00 (already on quarter)", () => {
    const d = new Date("2026-03-14T09:00:00Z");
    const r = roundToQuarter(d);
    expect(r.getUTCMinutes()).toBe(0);
  });

  it("rounds 9:08 up to 9:15", () => {
    const d = new Date("2026-03-14T09:08:00Z");
    const r = roundToQuarter(d);
    expect(r.getUTCMinutes()).toBe(15);
  });

  it("rounds 9:52 → 10:00", () => {
    const d = new Date("2026-03-14T09:52:00Z");
    const r = roundToQuarter(d);
    expect(r.getUTCHours()).toBe(10);
    expect(r.getUTCMinutes()).toBe(0);
  });

  it("rounds 23:53 → 00:00 next day", () => {
    const d = new Date("2026-03-14T23:53:00Z");
    const r = roundToQuarter(d);
    expect(r.getUTCDate()).toBe(15);
    expect(r.getUTCHours()).toBe(0);
    expect(r.getUTCMinutes()).toBe(0);
  });

  it("zeroes out seconds and milliseconds", () => {
    const d = new Date("2026-03-14T09:07:45.123Z");
    const r = roundToQuarter(d);
    expect(r.getUTCSeconds()).toBe(0);
    expect(r.getUTCMilliseconds()).toBe(0);
  });
});

/* ------------------------------------------------------------------ */
/*  addDays / addHours                                                */
/* ------------------------------------------------------------------ */
describe("addDays", () => {
  it("adds days correctly", () => {
    const result = addDays("2026-03-14T12:00:00.000Z", 7);
    expect(result).toBe("2026-03-21T12:00:00.000Z");
  });

  it("subtracts days with negative value", () => {
    const result = addDays("2026-03-14T12:00:00.000Z", -3);
    expect(result).toBe("2026-03-11T12:00:00.000Z");
  });

  it("crosses month boundary", () => {
    const result = addDays("2026-03-30T12:00:00.000Z", 5);
    expect(result).toBe("2026-04-04T12:00:00.000Z");
  });
});

describe("addHours", () => {
  it("adds hours correctly", () => {
    const result = addHours("2026-03-14T12:00:00.000Z", 3);
    expect(result).toBe("2026-03-14T15:00:00.000Z");
  });

  it("crosses day boundary", () => {
    const result = addHours("2026-03-14T23:00:00.000Z", 2);
    expect(result).toBe("2026-03-15T01:00:00.000Z");
  });
});

/* ------------------------------------------------------------------ */
/*  getLocalTimezone                                                  */
/* ------------------------------------------------------------------ */
describe("getLocalTimezone", () => {
  it("returns a non-empty IANA timezone string", () => {
    const tz = getLocalTimezone();
    expect(typeof tz).toBe("string");
    expect(tz.length).toBeGreaterThan(0);
    // IANA timezones contain a slash (e.g., America/New_York) or are UTC
    expect(tz).toMatch(/\/|UTC/);
  });
});

/* ------------------------------------------------------------------ */
/*  Smart defaults: defaultEventStart, defaultFollowUpDue             */
/* ------------------------------------------------------------------ */
describe("defaultEventStart", () => {
  it("returns next business day at 9:00 AM UTC", () => {
    // Friday March 13, 2026
    const result = defaultEventStart(new Date("2026-03-13T12:00:00Z"));
    // Should be Monday March 16 at 09:00
    expect(result).toBe("2026-03-16T09:00:00.000Z");
  });

  it("returns next weekday when starting from Wednesday", () => {
    const result = defaultEventStart(new Date("2026-03-18T12:00:00Z"));
    // Thursday March 19 at 09:00
    expect(result).toBe("2026-03-19T09:00:00.000Z");
  });
});

describe("defaultFollowUpDue", () => {
  it("returns 7 days later at 9:00 AM UTC", () => {
    const result = defaultFollowUpDue(new Date("2026-03-14T15:30:00Z"));
    expect(result).toBe("2026-03-21T09:00:00.000Z");
  });

  it("crosses month boundary correctly", () => {
    const result = defaultFollowUpDue(new Date("2026-03-28T12:00:00Z"));
    expect(result).toBe("2026-04-04T09:00:00.000Z");
  });
});
