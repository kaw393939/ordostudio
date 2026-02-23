# Date/Time Contract

> Canonical reference for how dates and times are stored, transported, and displayed throughout the LMS application.

## Storage

- All dates stored as **ISO 8601 strings in UTC**: `YYYY-MM-DDTHH:mm:ssZ` (or `YYYY-MM-DDTHH:mm:ss.sssZ`).
- No bare date-only strings (`2026-03-14`) unless the field is explicitly date-only by domain design.
- Timezone offsets are **never** stored — UTC only.
- The `recurrence_rule` field (optional) stores iCalendar RRULE text when present.

## Transport (API)

- All API request and response bodies use **UTC ISO 8601 strings**.
- Clients must convert local times to UTC before sending.
- Servers must never assume a client's timezone.

## Display

Three canonical display modes used everywhere in the UI:

| Mode | Format Example | Use Case |
|------|----------------|----------|
| **Absolute** | `Sat, Mar 14, 2026 · 9:00 AM ET` | Event cards, detail pages, tooltips |
| **Relative** | `in 3 days`, `2 hours ago` | Timelines, activity feeds, dashboards |
| **Compact** | `Mar 14` or `3/14/2026` | Table cells, badges, narrow spaces |

### Rules

1. **Every displayed date includes timezone context** — either an explicit label (e.g., "ET") or a tooltip showing the full timestamp with timezone.
2. Timezone is detected from the user's browser (`Intl.DateTimeFormat().resolvedOptions().timeZone`) or an explicitly set preference.
3. **No raw `.toLocaleString()`** or `.toLocaleDateString()` calls — use shared formatters from `src/lib/date-time.ts`.
4. **No raw `new Date()` display** — always pipe through a formatter.

## Shared Utilities (`src/lib/date-time.ts`)

| Function | Purpose |
|----------|---------|
| `nowISO()` | Returns current time as UTC ISO string |
| `parseISO(value)` | Parses a date string, validates, returns `Date` or throws |
| `toUTC(date, tz?)` | Converts a local date/time to UTC ISO string |
| `toLocal(isoString, tz?)` | Converts a UTC ISO string to a `Date` in the given timezone |
| `formatAbsolute(iso, tz?)` | `"Sat, Mar 14, 2026 · 9:00 AM ET"` |
| `formatRelative(iso)` | `"in 3 days"`, `"2 hours ago"`, `"just now"` |
| `formatCompact(iso, tz?)` | `"Mar 14"` or `"3/14/2026"` |
| `formatDate(iso, tz?)` | `"March 14, 2026"` |
| `formatTime(iso, tz?)` | `"9:00 AM ET"` |
| `formatDateTime(iso, tz?)` | `"Mar 14, 2026 · 9:00 AM ET"` |
| `nextBusinessDay(from?)` | Next weekday (Mon–Fri) from given date |
| `roundToQuarter(date)` | Rounds time to nearest 15-minute increment |
| `addDays(iso, days)` | Date arithmetic — add days |
| `addHours(iso, hours)` | Date arithmetic — add hours |
| `isValidISO(value)` | Boolean check for valid ISO 8601 string |
| `getLocalTimezone()` | Returns IANA timezone from browser |

## Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `<DatePicker>` | `src/components/forms/date-picker.tsx` | Calendar popover + text entry |
| `<TimePicker>` | `src/components/forms/time-picker.tsx` | Hour/minute selection with 12h/24h |
| `<DateRangePicker>` | `src/components/forms/date-range-picker.tsx` | Two-month calendar with range + presets |
| `<DateTimePicker>` | `src/components/forms/date-time-picker.tsx` | Date + Time compound field |
| `<RelativeTime>` | `src/components/forms/relative-time.tsx` | Auto-updating "3 days ago" display |

## DST & Edge-Case Policy

- All date components and utilities **must** pass tests for:
  - Spring-forward (e.g., 2026-03-08 2:00 AM → 3:00 AM in `America/New_York`)
  - Fall-back (e.g., 2026-11-01 2:00 AM → 1:00 AM in `America/New_York`)
  - Leap day (Feb 29)
  - Year-end boundary (Dec 31 → Jan 1)
- Invalid date input **must** show a specific, friendly error message — never a silent failure or browser default.

## Developer Checklist

- [ ] Use `nowISO()` instead of `new Date().toISOString()`
- [ ] Use `parseISO()` instead of `new Date(value)` + manual validation
- [ ] Use `formatAbsolute()` / `formatRelative()` / `formatCompact()` for display
- [ ] Always pass timezone to display formatters — never rely on implicit locale
- [ ] New date fields use `<DatePicker>` / `<DateTimePicker>` — not raw `<input type="datetime-local">`
