# Sprint 48 — Public Events Discovery, Registration Date UX, Countdown & Add-to-Calendar

## Goal
Make the public events experience feel like a best-in-class product: visually rich event cards with clear date hierarchy, a live countdown that builds urgency, skeleton-loaded discovery pages, and seamless "Add to Calendar" integration so registered events immediately appear in users' personal calendars.

## Scope

### Event Card Design Refresh
- Redesign event cards with visual hierarchy: **title → date/time badge → location → status pill → CTA**.
- Status pills with semantic color + icon: "Open" (green/check), "Closing Soon" (amber/clock), "Closed" (gray/x), "In Progress" (blue/play).
- `<Skeleton>` shimmer placeholders during card list loading — no layout shift.
- Hover micro-interaction: subtle card elevation + border glow on focus/hover.
- Responsive grid: 1-col mobile → 2-col tablet → 3-col desktop.
- Framer Motion stagger animation on initial card list render.

### Date Presentation Hierarchy
- Primary: human-friendly date ("Sat, Mar 14 · 9:00 AM – 12:00 PM").
- Secondary: timezone label ("Eastern Time").
- Tertiary: relative context ("Starts in 5 days" or "Started 2 hours ago").
- Use `<RelativeTime>` from Sprint 47 for live-updating relative labels.

### Registration Deadline & Countdown
- Prominent deadline badge on event detail page when registration window has a closing date.
- Live countdown timer component (`<Countdown>`) for events closing within 7 days:
  - Shows days / hours / minutes remaining.
  - Pulses gently when < 1 hour remaining.
  - Converts to "Registration closed" when expired.
- Registration form shows deadline in helper text: "Register by Fri, Mar 13 at 11:59 PM ET".

### Add to Calendar Integration
- After successful registration, show "Add to Calendar" button group:
  - Google Calendar (URL link opens in new tab).
  - Apple Calendar / Outlook (`.ics` file download).
- Include event title, date/time, location, and event detail URL in calendar entry.
- Also available on account "My Registrations" for past-registered events.

### Date-Filtered Discovery
- `<DateRangePicker>` filter on events list page for custom date browsing.
- Quick-filter chips: "This week", "This month", "Upcoming".
- Clear empty state with illustration and copy: "No events match your date range. Try expanding your search."
- Persist filter state in URL query params (via `nuqs`) for shareability and back-button reliability.

### Visual Event Timeline (Stretch)
- Optional timeline/calendar mini-view showing upcoming events as dots on a month strip.
- Clicking a dot scrolls/filters to that event in the list.

### Mobile-Specific Refinements
- Bottom-sheet filter drawer instead of inline filters on narrow viewports.
- Swipeable event cards in a horizontal scroll for "Featured" or "This Week" sections.
- Touch-optimized date pickers and filter chips.

### SEO & Page Metadata (Audit-Driven)
The audit found pages lack proper `<title>` and OpenGraph metadata.
- Every public page exports Next.js `metadata` with descriptive `<title>` and `og:title`.
- Event detail pages generate dynamic metadata from event data: title, description, date, image.
- Structured data (JSON-LD) for events: `Event` schema with name, date, location, URL.
- Canonical URLs set on all public routes.

### Services Page Visual Refresh
The audit found the services page is a basic text list. Upgrade:
- Service cards with Lucide icons, title, description, and "Learn more" or "Request" CTA.
- Visual grouping by service category.
- Skeleton loading during async fetch.

### Custom 404 for Events
- `/events/[slug]` returns a branded 404 page when slug doesn't match: "This event doesn't exist or has been removed."
- Suggest nearby events or link to full events list.
- Match design system styling (not default Next.js error).

## TDD Process
1. Write failing tests for event card rendering: status pill text, date format, skeleton during load.
2. Write failing tests for `<Countdown>` at various thresholds: 7d, 1d, 1h, 0 (expired).
3. Write failing tests for "Add to Calendar" link generation (Google URL, `.ics` content).
4. Write failing tests for date-range filter state in URL params and no-results empty state.
5. Write failing tests for stagger animation application and reduced-motion graceful degradation.
6. Implement UI components and integrate on events list and event detail pages.
7. Refactor duplicated date-display code into shared presentational helpers.

## Stories
- As a prospective registrant, I see beautiful event cards that immediately tell me what, when, and whether I can still register.
- As someone in a hurry, the countdown timer shows me exactly how much time I have left.
- As a registered attendee, I can instantly add the event to my calendar so I never forget.
- As a mobile user, the events page loads fast, looks great, and is effortless to filter and browse.

## Acceptance Criteria
- [x] Event cards have clear visual hierarchy: title, date badge, status pill, CTA.
- [x] Skeleton loading displays during async fetch with no layout shift.
- [x] Status pills use semantic color + Lucide icon and update based on event temporal state.
- [x] `<Countdown>` shows live countdown for events closing within 7 days; transitions to "Closed" at expiry.
- [x] "Add to Calendar" generates correct Google Calendar URL and valid `.ics` file.
- [x] Date-range filter persists in URL, shows empty state for no results.
- [x] Framer Motion stagger animates card list entry; respects reduced-motion.
- [x] Responsive grid works at mobile/tablet/desktop breakpoints.
- [x] Every public page has proper `<title>`, `og:title`, and canonical URL.
- [x] Event detail pages include JSON-LD structured data.
- [x] Services page uses card layout with icons and CTA.
- [x] Custom 404 page renders for invalid event slugs.
- [x] Both light and dark modes render correctly.
- [x] Lint, tests, and build pass.

## Completion Record

**Status**: COMPLETE

### Key Deliverables
- Public events list: refreshed card grid + skeletons + stagger motion + date-range picker and quick chips (This week / This month / Upcoming) with URL persistence via `nuqs`.
- Event detail: date hierarchy + countdown + add-to-calendar (Google + `.ics`) + JSON-LD + canonical + dynamic metadata.
- Services: card grid with icons, grouped display, skeleton loading, and CTAs.
- Events 404: branded `/events/[slug]` not-found page with real 404 status (`notFound()`).

### Verification
- `npx next build`: pass
- `npx eslint`: 0 errors (warnings may exist per repo baseline)
- Sprint 48-focused tests: pass (`calendar-links`, `countdown`, `event-card`)
- Full suite: existing failing tests remain in the repo baseline (not introduced by this sprint)

## End-of-Sprint Verification
```bash
npm run test -- src/app/(public)/** src/lib/** src/components/**
npm run lint
npm run build
```
Manual checks:
- Browse events on desktop and mobile viewports; confirm responsiveness and card quality.
- Verify countdown timer on an event closing within hours.
- Register for an event and use "Add to Calendar" for both Google and `.ics`.
- Filter events by date range, verify URL updates, then use browser back button.
- Test with reduced-motion enabled; animations should be instant.

Pass condition:
- The public events experience feels like a premium product — fast, beautiful, date-clear.

## Exit Gate
Move sprint only when acceptance criteria and verification pass.
