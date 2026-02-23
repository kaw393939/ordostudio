# Sprint 49 — Account Dashboard, Follow-Up Tracking & Notification UX

## Goal
Transform the account experience into a personal command center where users see at a glance what's done, what's due, and what needs attention — with progress visualization, inline editing, and notification badges that make overdue items impossible to ignore.

## Scope

### Account Dashboard Redesign
- Refactor account page into a tabbed layout (`<Tabs>`): **Overview | My Registrations | Follow-Ups | Feedback**.
- **Overview tab**: at-a-glance summary cards showing:
  - Upcoming events count with next-event preview.
  - Open follow-up actions count with soonest due date.
  - Overdue items count (red badge if > 0).
  - Recent activity feed (last 5 actions).
- Entry animations: cards fade-in with stagger; skeleton placeholders during load.

### Progress Visualization
- `<ProgressRing>` (circular gauge) for follow-up completion percentage per engagement.
- `<ProgressBar>` for overall action completion across all engagements.
- Color transitions: green (on track) → amber (approaching due) → red (overdue).
- Accessible: progress value announced via `aria-valuenow`/`aria-valuemax`.

### Follow-Up Timeline Improvements
- Timeline entries grouped by date with sticky date headers.
- Each entry shows: action title, status badge, due date (with `<RelativeTime>`), assignee avatar.
- Overdue items: red left-border accent + "Overdue by X days" label.
- Upcoming items within 48h: amber accent + "Due tomorrow" or "Due today" label.

### Inline Editing & Quick Actions
- Click-to-edit status transitions directly in timeline rows (e.g., "Open → In Progress" without page navigation).
- Optimistic UI: status changes immediately with background API call; rollback on failure with error toast.
- Quick-complete button: one-click "Mark Done" for simple follow-ups.
- Swipe-to-complete gesture on mobile (stretch goal).

### Notification Badges & Attention Management
- Badge component on account nav icon showing unread/overdue count.
- Badge on "Follow-Ups" tab showing pending + overdue total.
- Badges auto-update when actions are completed (optimistic decrement).

### Reminder Display & Acknowledgement
- Reminder cards with clear trigger context: "This action is due in 2 days — you set a reminder."
- One-click acknowledge with toast confirmation.
- Snooze option: "Remind me in 1 day / 3 days / 1 week".
- Reminder history expandable section at bottom of engagement detail.

### Drag-to-Reorder (Stretch)
- Allow users to manually reorder follow-up priority within an engagement.
- Persist custom sort order; default sort remains by due date.

### Empty States
- Friendly illustrated empty states per tab:
  - No registrations yet → "Browse upcoming events" CTA.
  - No follow-ups → "All caught up! 🎉" message.
  - No feedback → "You'll see requests for feedback here after your events."

### Registration History Improvements (Audit-Driven)
The audit found the account "My Registrations" view is a basic list with minimal context.
- Each registration row shows: event title, date (with `<RelativeTime>`), status badge, and "Add to Calendar" quick action.
- Past events distinguished from upcoming with visual dimming.
- Cancel registration action uses `<AlertDialog>` (not browser confirm) with undo toast.
- Link to event detail page from each row.
- Sort toggle: by date (default) or by status.

### Account Profile Section
- Ensure profile edit form uses shared field wrappers from Sprint 46.
- Display last-login timestamp using `<RelativeTime>`.
- Show audit trail of recent account actions ("Registered for X", "Marked Y done").

## TDD Process
1. Write failing tests for tabbed layout rendering with correct counts on Overview cards.
2. Write failing tests for `<ProgressRing>` and `<ProgressBar>` at 0%, 50%, 100%, and overdue thresholds.
3. Write failing tests for timeline date-grouping, sticky headers, and overdue/upcoming accent logic.
4. Write failing tests for inline status transition (optimistic update + rollback on error).
5. Write failing tests for notification badge count calculation and decrement on completion.
6. Write failing tests for reminder acknowledge and snooze actions.
7. Write failing tests for empty states per tab.
8. Implement account dashboard redesign with progress, inline editing, badges, and reminders.

## Stories
- As an account user, I open my dashboard and instantly see what needs my attention today — no scrolling, no hunting.
- As a busy professional, I can mark follow-ups done with one click without leaving my timeline.
- As someone juggling multiple engagements, progress rings show me which engagements need the most attention.
- As a mobile user, I can scan, acknowledge, and complete actions with minimal taps.

## Acceptance Criteria
- [ ] Account page uses tabbed layout with Overview, Registrations, Follow-Ups, and Feedback tabs.
- [ ] Overview cards show correct counts with skeleton loading.
- [ ] `<ProgressRing>` and `<ProgressBar>` reflect accurate completion percentages with color thresholds.
- [ ] Timeline groups by date with sticky headers; overdue/upcoming items have distinct visual treatment.
- [ ] Inline status editing works with optimistic UI and error rollback.
- [ ] Notification badges appear on nav and tab when overdue/pending items exist.
- [ ] Reminder acknowledge and snooze work with toast feedback.
- [ ] Empty states display per tab with appropriate CTAs.
- [ ] Registration history shows enriched rows with status, date, and quick actions.
- [ ] Cancel registration uses `<AlertDialog>` with undo toast (no browser confirm).
- [ ] Profile section uses shared field wrappers with persistent labels.
- [ ] All components work in light and dark mode.
- [ ] Lint, tests, and build pass.

## End-of-Sprint Verification
```bash
npm run test -- src/app/** src/lib/** src/core/** src/components/**
npm run lint
npm run build
```
Manual checks:
- Verify account overview with mixed completed/overdue/upcoming actions.
- Inline-edit a follow-up status and confirm optimistic update.
- Acknowledge a reminder and verify badge count decrements.
- View each tab's empty state by filtering to a user with no data.
- Test on mobile viewport for touch usability.

Pass condition:
- Account dashboard is a genuinely useful personal command center, not just a data list.

## Exit Gate
Move sprint only when acceptance criteria and verification pass.
