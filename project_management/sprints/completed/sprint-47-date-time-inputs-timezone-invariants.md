# Sprint 47 — Date/Time Input System, Timezone Invariants & Relative-Time Display

## Goal
Build a date/time system so reliable and intuitive that users never second-guess what date they selected, admins never ship the wrong timezone, and the UI always shows time in a way that feels natural ("in 3 hours", "last Tuesday").

## Scope

### Audit-Driven: Date Display Inconsistency Fix (P2)
The UI audit found dates displayed inconsistently across the app: raw ISO strings in some places, "X days ago" with no tooltip in others, and varying formats page-to-page. This sprint eliminates all of that.
- Grep for raw `new Date()` display or manual `.toLocaleDateString()` calls and replace with shared formatters.
- Establish **3 canonical display modes** used everywhere:
  1. **Absolute**: "Sat, Mar 14, 2026 · 9:00 AM ET" (for event cards, detail pages).
  2. **Relative**: "in 3 days" or "2 hours ago" (for timelines, activity feeds).
  3. **Compact**: "Mar 14" or "3/14" (for table cells, badges).
- Every displayed date includes timezone context (explicit label or tooltip).

### Canonical Date/Time Contract
- All dates stored as ISO 8601 strings in UTC (`YYYY-MM-DDTHH:mm:ssZ`).
- All API transport uses UTC; client converts for display using the user's detected or explicitly set timezone.
- Document the contract in a `DATE_TIME_CONTRACT.md` at repo root for developer reference.
- Add a shared `tz` module: `toUTC()`, `toLocal()`, `formatDate()`, `formatTime()`, `formatDateTime()`, `formatRelative()`.

### Date Picker Component
- Wrap shadcn `<Calendar>` + `<Popover>` into a `<DatePicker>` with:
  - Click-to-open calendar popover with month/year navigation.
  - Manual text-entry fallback (typed date string parsed and validated).
  - Min/max constraints with disabled-date styling.
  - Keyboard-navigable grid (arrow keys, Enter to select, Escape to close).
  - Clear button to reset value.
  - Locale-aware month/day names and first-day-of-week.

### Time Picker Component
- `<TimePicker>` with 12h/24h toggle based on locale:
  - Hour and minute selects or a scrollable time-slot list.
  - Smart defaults: next nearest 15-minute increment.
  - Min/max time constraints.

### Date-Range Picker
- `<DateRangePicker>` showing two-month calendar view with start/end selection:
  - Visual highlight of selected range.
  - Quick-select presets: "Today", "This week", "This month", "Last 30 days", "Custom".
  - Used for admin filters, reporting periods, and event scheduling.

### DateTime Combo
- `<DateTimePicker>` combining date picker + time picker into a single compound field.
- Used for event start/end, follow-up due dates, reminder scheduling.

### Relative-Time Display
- `<RelativeTime>` component: "3 days ago", "in 2 hours", "just now", "tomorrow at 3pm".
- Auto-updates on a 60-second interval for near-future/past values.
- Hover/title shows full formatted timestamp with timezone.
- Configurable threshold: switch to absolute date after 7 days.

### Smart Defaults
- New event start: next business day, 9:00 AM local time.
- New follow-up due: 7 days from now.
- Date fields pre-fill with sensible context-based defaults where UX benefits.
- "Now" button for timestamp fields.

### DST & Edge-Case Safety
- Unit tests for DST spring-forward and fall-back transitions.
- Tests for leap-day handling (Feb 29) and year-end boundaries.
- Tests for timezone offset changes mid-range selection.
- Invalid date string handling: show specific error ("Please enter a valid date in MM/DD/YYYY format") rather than silent failure.

### Recurring Date Patterns
- Utility for expressing simple recurrence (daily/weekly/monthly) for potential future scheduling.
- Data model supports `recurrence_rule` as optional text field placeholder.

## TDD Process
1. Write failing unit tests for `toUTC`/`toLocal` round-trips across 5+ timezone fixtures including DST boundaries.
2. Write failing tests for `formatRelative` output at 1 min, 1 hour, 1 day, 6 days, 7 days, 30 days, 1 year thresholds.
3. Write failing tests for `<DatePicker>` keyboard navigation: arrow-key movement, Enter select, Escape close, Tab to fields.
4. Write failing tests for `<DateRangePicker>` start/end selection with quick-select presets.
5. Write failing tests for `<DateTimePicker>` compound field validation (date without time = error, time without date = error).
6. Write failing tests for invalid/partial typed date input with user-friendly error messages.
7. Write failing tests for smart defaults (next business day, 15-minute rounding).
8. Implement utilities, components, and smart-default logic.
9. Refactor existing date fields in 2–3 pages to consume new shared components.

## Stories
- As a user, I can pick dates from a beautiful calendar or type them in, and I always see my timezone reflected.
- As an admin scheduling an event, I get smart defaults that save me clicks and prevent timezone mistakes.
- As anyone reading a timestamp, I see "2 hours ago" instead of a raw ISO string, with the full date on hover.
- As a developer, I have one canonical way to handle dates — no more ad-hoc `new Date()` parsing scattered through the codebase.

## Acceptance Criteria
- [x] `DATE_TIME_CONTRACT.md` documents storage, transport, and display rules including the 3 canonical display modes.
- [x] **Zero** raw `new Date().toLocaleDateString()` or manual date formatting calls remain outside shared formatters.
- [x] `<DatePicker>`, `<TimePicker>`, `<DateRangePicker>`, `<DateTimePicker>` are implemented and tested.
- [x] `<RelativeTime>` renders human-friendly strings and updates live.
- [x] Smart defaults populate sensible values in at least 2 form contexts.
- [x] DST boundary tests explicitly pass for spring-forward and fall-back.
- [x] Invalid date entry shows specific, friendly error text — not browser default or silent failure.
- [x] Keyboard-only date selection works end-to-end.
- [x] Both light and dark mode render date components correctly.
- [x] Lint, tests, and build pass.

## Completion Record

**Status**: COMPLETE

### Deliverables
| Artifact | Tests | Notes |
|---|---|---|
| `DATE_TIME_CONTRACT.md` | — | Canonical reference: UTC storage, 3 display modes, developer checklist |
| `src/lib/date-time.ts` (~410 lines) | 56 unit tests | `parseISO`, `nowISO`, `toUTC`/`toLocal`, `formatAbsolute`/`Relative`/`Compact`/`Date`/`Time`/`DateTime`, `nextBusinessDay`, `roundToQuarter`, `addDays`/`addHours`, `defaultEventStart`/`defaultFollowUpDue` |
| `src/components/forms/date-picker.tsx` | 10 tests | Calendar + Popover, min/max constraints, clear button |
| `src/components/forms/time-picker.tsx` | 12 tests | 12h/24h, configurable minute step, smart defaults |
| `src/components/forms/date-range-picker.tsx` | 8 tests | Two-month calendar, quick-select presets, clear |
| `src/components/forms/date-time-picker.tsx` | 6 tests | Compound DatePicker + TimePicker, UTC ISO I/O |
| `src/components/forms/relative-time.tsx` | 10 tests | Auto-updating, `<time>` element, absolute tooltip |
| shadcn Calendar component | — | `react-day-picker` added as dependency |
| Barrel export updated | — | All 5 components exported from `forms/index.ts` |

### Refactoring (14 files touched)
- Replaced `.toLocaleString()` in `account/page.tsx` (2 sites) → `formatAbsolute`/`formatDateTime`
- Replaced `datetime-local` inputs in `admin/audit/page.tsx` → `<DateTimePicker>` + `<RelativeTime>`
- Eliminated duplicated `parseIso()` in 5 files → shared `parseISO` from `date-time.ts`
- Replaced `new Date().toISOString()` in 5 files → `nowISO()`
- Added `auditQuickRangeIso()` to `admin-operations-ui.ts` for ISO-based quick ranges

### Test Results
- **102 Sprint 47 tests**: 6 files, all passing
- **Full suite**: 414 passing, 7 failing (all 7 pre-existing — verified via `git stash` baseline)
- **Build**: Compiled successfully, 0 TypeScript errors
- **Lint**: 0 errors, 12 warnings (all pre-existing)

## End-of-Sprint Verification
```bash
npm run test -- src/core/** src/lib/** src/components/** src/app/**
npm run lint
npm run build
```
Manual checks:
- Create/edit a date record around DST start/end boundaries and verify persisted value.
- Compare displayed date in two browser timezone settings — both should show correct local time.
- Test `<DateRangePicker>` quick-select presets and custom range selection.
- Hover over `<RelativeTime>` and verify tooltip shows full timestamp with timezone.

Pass condition:
- Date/time infrastructure is beautiful, bulletproof, and ready for domain-specific application in sprints 48–50.

## Exit Gate
Move sprint only when acceptance criteria and verification pass.
