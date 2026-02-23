/**
 * Canonical date/time utilities for the LMS application.
 *
 * All dates are stored and transported as UTC ISO 8601 strings.
 * Display functions convert to local time using Intl.DateTimeFormat.
 *
 * Core parsing functions (parseISO, nowISO, isValidISO) are now defined
 * in @/platform/date-time and re-exported here for backward compatibility.
 * New code in the domain/core layer should import from @/platform/date-time.
 *
 * @see /DATE_TIME_CONTRACT.md
 */

/* ------------------------------------------------------------------ */
/*  Core parsing  (re-exported from platform layer)                   */
/* ------------------------------------------------------------------ */

import { parseISO, nowISO, isValidISO } from "@/platform/date-time";
import { getLocale } from "@/platform/locale";
export { parseISO, nowISO, isValidISO };

/* ------------------------------------------------------------------ */
/*  Timezone conversion                                               */
/* ------------------------------------------------------------------ */

/**
 * Converts a local Date (interpreted as being in `tz`) to a UTC ISO string.
 *
 * Uses Intl.DateTimeFormat to find the UTC offset for the given timezone
 * at the given point in time, then applies the inverse offset.
 */
export function toUTC(localDate: Date, tz?: string): string {
  const timezone = tz ?? getLocalTimezone();

  // Format the parts in the target timezone to extract the offset
  const formatter = new Intl.DateTimeFormat(getLocale(), {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    fractionalSecondDigits: 3,
  });

  // We need to find what UTC time corresponds to the given local time.
  // Strategy: format a known UTC time in the target TZ, compute offset,
  // then apply inverse to get back to UTC.

  // Get the parts of localDate when interpreted in the target timezone
  const parts = formatter.formatToParts(localDate);
  const get = (type: string) =>
    parts.find((p) => p.type === type)?.value ?? "0";

  const tzYear = parseInt(get("year"), 10);
  const tzMonth = parseInt(get("month"), 10) - 1;
  const tzDay = parseInt(get("day"), 10);
  const tzHour = parseInt(get("hour"), 10) === 24 ? 0 : parseInt(get("hour"), 10);
  const tzMinute = parseInt(get("minute"), 10);
  const tzSecond = parseInt(get("second"), 10);
  const tzMs = parseInt(get("fractionalSecond") || "0", 10);

  // What the UTC clock says when we format localDate in TZ
  const utcMs = localDate.getTime();

  // What the TZ clock says at the same instant
  const tzDate = new Date(tzYear, tzMonth, tzDay, tzHour, tzMinute, tzSecond, tzMs);
  const tzMs2 = tzDate.getTime();

  // Offset = TZ clock - UTC clock (in ms)
  const offsetMs = tzMs2 - utcMs;

  // To convert a "local TZ" time to UTC: subtract the offset
  const localAsUtc = new Date(
    localDate.getFullYear(),
    localDate.getMonth(),
    localDate.getDate(),
    localDate.getHours(),
    localDate.getMinutes(),
    localDate.getSeconds(),
    localDate.getMilliseconds()
  );
  const utcTime = localAsUtc.getTime() - offsetMs;

  return new Date(utcTime).toISOString();
}

/**
 * Converts a UTC ISO string to a Date whose local fields
 * (getHours, getMinutes, etc.) reflect the given timezone.
 *
 * Note: The returned Date object's internal UTC value is shifted
 * so that calling getHours()/getMinutes() returns the local time.
 * This is a display-oriented helper, not a true timezone-aware Date.
 */
export function toLocal(isoString: string, tz?: string): Date {
  const timezone = tz ?? getLocalTimezone();
  const utcDate = parseISO(isoString);

  const formatter = new Intl.DateTimeFormat(getLocale(), {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    fractionalSecondDigits: 3,
  });

  const parts = formatter.formatToParts(utcDate);
  const get = (type: string) =>
    parts.find((p) => p.type === type)?.value ?? "0";

  const year = parseInt(get("year"), 10);
  const month = parseInt(get("month"), 10) - 1;
  const day = parseInt(get("day"), 10);
  let hour = parseInt(get("hour"), 10);
  if (hour === 24) hour = 0;
  const minute = parseInt(get("minute"), 10);
  const second = parseInt(get("second"), 10);
  const ms = parseInt(get("fractionalSecond") || "0", 10);

  return new Date(year, month, day, hour, minute, second, ms);
}

/* ------------------------------------------------------------------ */
/*  Display formatters                                                */
/* ------------------------------------------------------------------ */

/**
 * Gets the short timezone abbreviation (e.g., "ET", "PT", "JST").
 */
function getTzAbbr(isoString: string, tz: string): string {
  const date = parseISO(isoString);
  const formatted = new Intl.DateTimeFormat(getLocale(), {
    timeZone: tz,
    timeZoneName: "short",
  }).format(date);
  // Extract the timezone part (last word)
  const parts = formatted.split(" ");
  return parts[parts.length - 1];
}

/**
 * Absolute format: "Sat, Mar 14, 2026 · 9:00 AM ET"
 */
export function formatAbsolute(isoString: string, tz?: string): string {
  const timezone = tz ?? getLocalTimezone();
  const date = parseISO(isoString);
  const abbr = getTzAbbr(isoString, timezone);

  const datePart = new Intl.DateTimeFormat(getLocale(), {
    timeZone: timezone,
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);

  const timePart = new Intl.DateTimeFormat(getLocale(), {
    timeZone: timezone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);

  return `${datePart} · ${timePart} ${abbr}`;
}

/**
 * Relative format with thresholds:
 * < 1 min: "just now"
 * < 1 hour: "X minutes ago" / "in X minutes"
 * < 1 day: "X hours ago" / "in X hours"
 * < 7 days: "X days ago" / "in X days"
 * >= 7 days: falls back to compact date
 */
export function formatRelative(isoString: string): string {
  const date = parseISO(isoString);
  const now = Date.now();
  const diffMs = now - date.getTime();
  const absDiff = Math.abs(diffMs);
  const isPast = diffMs > 0;

  const MINUTE = 60_000;
  const HOUR = 60 * MINUTE;
  const DAY = 24 * HOUR;
  const WEEK = 7 * DAY;

  if (absDiff < MINUTE) return "just now";

  if (absDiff < HOUR) {
    const mins = Math.floor(absDiff / MINUTE);
    return isPast
      ? `${mins} minute${mins === 1 ? "" : "s"} ago`
      : `in ${mins} minute${mins === 1 ? "" : "s"}`;
  }

  if (absDiff < DAY) {
    const hours = Math.floor(absDiff / HOUR);
    return isPast
      ? `${hours} hour${hours === 1 ? "" : "s"} ago`
      : `in ${hours} hour${hours === 1 ? "" : "s"}`;
  }

  if (absDiff < WEEK) {
    const days = Math.floor(absDiff / DAY);
    return isPast
      ? `${days} day${days === 1 ? "" : "s"} ago`
      : `in ${days} day${days === 1 ? "" : "s"}`;
  }

  // >= 7 days: fall back to compact
  return formatCompact(isoString);
}

/**
 * Compact format: "Mar 14" (same year) or "Mar 14, 2025" (different year).
 */
export function formatCompact(isoString: string, tz?: string): string {
  const timezone = tz ?? getLocalTimezone();
  const date = parseISO(isoString);
  const currentYear = new Date().getFullYear();
  const dateYear = parseInt(
    new Intl.DateTimeFormat(getLocale(), {
      timeZone: timezone,
      year: "numeric",
    }).format(date),
    10
  );

  const options: Intl.DateTimeFormatOptions = {
    timeZone: timezone,
    month: "short",
    day: "numeric",
  };

  if (dateYear !== currentYear) {
    options.year = "numeric";
  }

  return new Intl.DateTimeFormat(getLocale(), options).format(date);
}

/**
 * Full date: "March 14, 2026"
 */
export function formatDate(isoString: string, tz?: string): string {
  const timezone = tz ?? getLocalTimezone();
  const date = parseISO(isoString);
  return new Intl.DateTimeFormat(getLocale(), {
    timeZone: timezone,
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

/**
 * Time with timezone: "9:00 AM ET"
 */
export function formatTime(isoString: string, tz?: string): string {
  const timezone = tz ?? getLocalTimezone();
  const date = parseISO(isoString);
  const abbr = getTzAbbr(isoString, timezone);
  const timePart = new Intl.DateTimeFormat(getLocale(), {
    timeZone: timezone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
  return `${timePart} ${abbr}`;
}

/**
 * Date + time: "Mar 14, 2026 · 9:00 AM ET"
 */
export function formatDateTime(isoString: string, tz?: string): string {
  const timezone = tz ?? getLocalTimezone();
  const date = parseISO(isoString);
  const abbr = getTzAbbr(isoString, timezone);

  const datePart = new Intl.DateTimeFormat(getLocale(), {
    timeZone: timezone,
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);

  const timePart = new Intl.DateTimeFormat(getLocale(), {
    timeZone: timezone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);

  return `${datePart} · ${timePart} ${abbr}`;
}

/* ------------------------------------------------------------------ */
/*  Smart defaults                                                    */
/* ------------------------------------------------------------------ */

/**
 * Returns the next business day (Mon–Fri) after the given date.
 * Defaults to today.
 */
export function nextBusinessDay(from?: Date): Date {
  const d = from ? new Date(from.getTime()) : new Date();
  // Advance to next day first
  d.setUTCDate(d.getUTCDate() + 1);
  const day = d.getUTCDay();
  if (day === 0) d.setUTCDate(d.getUTCDate() + 1); // Sunday → Monday
  if (day === 6) d.setUTCDate(d.getUTCDate() + 2); // Saturday → Monday
  return d;
}

/**
 * Rounds a Date to the nearest 15-minute increment (ceiling).
 * Zeroes out seconds and milliseconds.
 */
export function roundToQuarter(date: Date): Date {
  const d = new Date(date.getTime());
  const minutes = d.getUTCMinutes();
  const remainder = minutes % 15;
  if (remainder !== 0) {
    d.setUTCMinutes(minutes + (15 - remainder));
  }
  d.setUTCSeconds(0, 0);
  return d;
}

/* ------------------------------------------------------------------ */
/*  Date arithmetic                                                   */
/* ------------------------------------------------------------------ */

/** Add (or subtract) days from a UTC ISO string. Returns a UTC ISO string. */
export function addDays(isoString: string, days: number): string {
  const d = parseISO(isoString);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString();
}

/** Add (or subtract) hours from a UTC ISO string. Returns a UTC ISO string. */
export function addHours(isoString: string, hours: number): string {
  const d = parseISO(isoString);
  d.setUTCHours(d.getUTCHours() + hours);
  return d.toISOString();
}

/* ------------------------------------------------------------------ */
/*  Timezone detection                                                */
/* ------------------------------------------------------------------ */

/** Returns the user's IANA timezone string from the browser. */
export function getLocalTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/* ------------------------------------------------------------------ */
/*  Smart defaults                                                    */
/* ------------------------------------------------------------------ */

/**
 * Default start for a new event: next business day at 9:00 AM UTC.
 * Returns a UTC ISO string.
 */
export function defaultEventStart(from?: Date): string {
  const day = nextBusinessDay(from);
  day.setUTCHours(9, 0, 0, 0);
  return day.toISOString();
}

/**
 * Default follow-up due date: 7 days from now, at 9:00 AM UTC.
 * Returns a UTC ISO string.
 */
export function defaultFollowUpDue(from?: Date): string {
  const d = from ? new Date(from.getTime()) : new Date();
  d.setUTCDate(d.getUTCDate() + 7);
  d.setUTCHours(9, 0, 0, 0);
  return d.toISOString();
}
