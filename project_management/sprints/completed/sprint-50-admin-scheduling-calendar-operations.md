# Sprint 50 — Admin Calendar Grid, Drag-to-Schedule, Batch Ops & Conflict Detection

## Goal
Give administrators a powerful visual calendar and scheduling surface that rivals dedicated scheduling tools — a month/week/day grid, drag-to-create/reschedule, conflict detection, batch operations, and print-ready exports.

## Scope

### Calendar Grid View
- Full-page calendar component with **Month**, **Week**, and **Day** views (toggle via `<Tabs>`).
- Events rendered as colored blocks on the calendar grid with title and time.
- Click an event block to open detail sheet/dialog.
- Click an empty slot to start "quick create" with the slot's date/time pre-filled.
- Responsive: month grid on desktop, week/day views on tablet/mobile.
- Skeleton loading for async event data.

### Drag-to-Schedule & Reschedule
- Drag an event block to a new time slot to reschedule (mouse + touch).
- Ghost preview during drag showing new position.
- On drop: confirmation dialog showing before/after date diff and affected registrations count.
- Optimistic UI: event moves immediately; rolls back with error toast on API failure.

### Conflict Detection & Visualization
- When placing/moving an event, detect overlapping events for the same venue or instructor.
- Conflicting slots highlighted in red/amber with tooltip explaining the conflict.
- "Resolve conflicts" suggested actions: view conflicting events, adjust time, choose different room.

### Batch Operations
- Multi-select events (checkbox or shift-click on calendar) for batch actions:
  - Batch reschedule (apply a date offset: "Move all +1 week").
  - Batch cancel with confirmation dialog.
  - Batch export to CSV.
- Bulk action toolbar appears when ≥ 1 event is selected.

### Scheduling Form Enhancements
- Admin event create/edit forms use `<DateTimePicker>` from Sprint 47.
- Side-by-side before/after preview for date changes.
- Participant impact notice: "This change affects 12 registered attendees."
- "Notify attendees" checkbox for date changes.

### Table View Improvements
- Sortable columns for date, status, title, registration count.
- `<DateRangePicker>` filter in table header.
- Row-level quick actions: reschedule, duplicate, cancel.
- Responsive: table scrolls horizontally on narrow viewports with frozen first column.

### Print-Friendly Schedule Export
- "Print Schedule" button generates a clean, ink-friendly layout:
  - Week or month view with event blocks, room assignments, instructor names.
  - Uses `@media print` CSS for clean output.
  - Option to export as PDF via browser print dialog.

### Admin Command Palette (Stretch)
- `<Command>` palette (Cmd+K / Ctrl+K) for quick navigation:
  - "Go to event…", "Create event", "Find user…", "View audit log".
  - Fuzzy search across event titles, user names, page names.

### Admin Navigation & Discoverability Overhaul (Audit-Driven)
The audit found flat admin navigation with no breadcrumbs, no search, and poor wayfinding.
- **Sidebar navigation**: replace or augment top-nav-only admin with collapsible sidebar showing:
  - Dashboard, Events, Users, Registrations, Engagements, Audit Log, Services, Intake, Commercial, Settings.
  - Active-page highlight and section grouping with Lucide icons.
  - Collapsible on narrow viewports; hamburger toggle on mobile.
- **Breadcrumbs**: every admin page shows breadcrumb trail (e.g., Admin › Events › Spring Workshop › Edit).
- **Page titles**: ensure every admin page has a descriptive `<h1>` and browser `<title>`.

### Audit Log UX Improvements (Audit-Driven)
The audit found the audit log page is functional but hard to scan.
- Lucide icons per action type (`UserPlus` for user create, `Pencil` for edit, `Trash2` for delete, `Shield` for auth events).
- Color-coded severity: info (neutral), warning (amber), critical (red).
- Date column uses `<RelativeTime>` with full timestamp on hover.
- `<DateRangePicker>` filter for audit date range.
- Expandable row details for audit payload/diff (JSON pretty-printed in `<pre>` with syntax highlighting).
- Export filtered audit log to CSV.

### Admin Empty States
- Every admin list page (events, users, registrations, audit, intake) has a branded empty state:
  - Icon + copy + primary CTA (e.g., "No events yet — Create your first event").
  - Not a blank table or raw "No data" text.

## TDD Process
1. Write failing tests for calendar grid rendering: month/week/day views with correct event placement.
2. Write failing tests for drag-to-reschedule: ghost preview, confirmation dialog, optimistic update, rollback.
3. Write failing tests for conflict detection: overlapping time slots flagged, tooltip content.
4. Write failing tests for batch-select and batch-action API calls with confirmation.
5. Write failing tests for scheduling form showing participant impact and before/after diff.
6. Write failing tests for table sort, filter, and responsive frozen-column behavior.
7. Write failing tests for print layout rendering without interactive controls.
8. Implement calendar grid, drag, batch ops, conflict detection, and table improvements.

## Stories
- As an admin, I can see my entire month's schedule at a glance and drag events to reschedule them instantly.
- As a scheduler, I'm warned about double-bookings before they happen.
- As an operations manager, I can select multiple events and move them all in one action.
- As someone preparing for a meeting, I can print a clean weekly schedule to bring to the room.
- As a power-user admin, I can press Cmd+K and navigate anywhere in the system in seconds.

## Acceptance Criteria
- [ ] Calendar renders in Month, Week, and Day views with events correctly placed.
- [ ] Drag-to-reschedule works with ghost preview, confirmation, and optimistic update.
- [ ] Conflicts are detected and visually flagged during schedule creation/editing.
- [ ] Batch select + batch reschedule/cancel/export work for multiple events.
- [ ] Scheduling forms use `<DateTimePicker>` and show participant impact on date changes.
- [ ] Table view supports sortable date columns and `<DateRangePicker>` filter.
- [ ] Print view generates a clean, ink-friendly schedule.
- [ ] Admin sidebar navigation with section grouping and active-page highlight.
- [ ] Breadcrumbs render correct hierarchy on every admin page.
- [ ] Audit log page has action-type icons, date filters, expandable details, and CSV export.
- [ ] Every admin list page has a branded empty state (not blank table).
- [ ] Command palette (stretch) provides fast navigation.
- [ ] All views work in light and dark mode.
- [ ] Lint, tests, and build pass.

## End-of-Sprint Verification
```bash
npm run test -- src/app/admin/** src/lib/** src/components/**
npm run lint
npm run build
```
Manual checks:
- Switch between Month/Week/Day views and verify event placement accuracy.
- Drag an event to a new slot, verify confirmation dialog, and check API persistence.
- Create overlapping events to trigger conflict detection.
- Select 3+ events and batch-reschedule.
- Print the weekly schedule and verify output quality.
- Use Cmd+K palette (if implemented) to navigate to an event.

Pass condition:
- Admin scheduling is visually powerful, operationally safe, and faster than any spreadsheet.

## Exit Gate
Move sprint only when acceptance criteria and verification pass.
