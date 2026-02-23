# i18n String Extraction Audit

> Sprint PRD-12 — Non-functional preparation for future multi-language support.
> All user-facing strings in the 10 highest-traffic pages are catalogued here.

## Legend

- **H** = Heading / Page title
- **L** = Label (form, table, status)
- **B** = Button / CTA
- **S** = Status message / Empty state
- **P** = Placeholder text
- **D** = Description / Subtitle
- **E** = Error message
- **T** = Tab label
- **N** = Navigation / Link text

---

## 1. Home Page — `src/app/(public)/page.tsx`

| Type | String |
|------|--------|
| H | "The Ordo method" |
| H | "Designed for leaders and builders" |
| H | "Training tracks" |
| H | "A modern bottega" |
| H | "Proof over vibes" |
| L | "Spec", "Tests", "Build", "Evaluate / Audit" |
| L | "CTOs / Eng Managers", "Individuals" |
| L | "Workshop", "Team program", "Advisory" |
| B | "Explore training tracks" |
| B | "See how the studio works" |
| L | "01 — Method", "02 — Outcomes", "03 — Offers", "04 — Studio", "05 — Proof" |

## 2. Events List — `src/app/(public)/events/page-client.tsx`

| Type | String |
|------|--------|
| H | "Events" |
| D | "Discover current and upcoming events." |
| B | "Search", "This week", "This month", "Upcoming", "Clear" |
| L | "Search", "Date range" |
| S | "Loading events", "We couldn't load events" |

## 3. Event Detail — `src/app/(public)/events/[slug]/page-client.tsx`

| Type | String |
|------|--------|
| H | "Your registration", "Next action" |
| L | "Event status:", "Engagement:", "Instructor:" |
| L | "Registration closes soon", "Add to calendar" |
| B | "Google Calendar", "Download .ics", "Join group waitlist", "Join group roster", "Working..." |
| S | "Loading event...", "This event doesn't exist or has been removed." |
| S | "Login to register.", "No action is available for this event state." |
| S | "Updated just now" |
| N | "Home", "Events", "Browse events", "Go home" |

## 4. Login — `src/app/(public)/login/page.tsx`

| Type | String |
|------|--------|
| H | "Login" |
| D | "Use your account credentials to sign in." |
| L | "Email", "Password" |
| P | "e.g., john@example.com", "At least 8 characters" |
| B | "Sign in" |
| N | "Need an account? Register", "Terms · Privacy" |
| E | "Login Link Missing", "API root did not include auth_login link." |

## 5. Register — `src/app/(public)/register/page.tsx`

| Type | String |
|------|--------|
| H | "Register" |
| D | "Create a new account." |
| L | "Email", "Password", "Confirm password" |
| P | "e.g., john@example.com", "At least 8 characters", "Re-enter your password" |
| D | "Must be at least 8 characters." |
| L | "I agree to the Terms and Privacy." |
| B | "Create account" |
| N | "Already have an account? Login" |
| E | "Register Link Missing" |

## 6. Account — `src/app/(public)/account/page.tsx`

| Type | String |
|------|--------|
| H | "Account" |
| D | "Manage your profile and registrations." |
| T | "Overview", "My Registrations", "Follow-Ups", "Feedback", "Referrals" |
| L | "Upcoming events", "Open follow-up actions", "Overdue items", "Recent activity" |
| S | "You are not logged in", "Sign in to access your account details and registrations." |
| S | "No upcoming events.", "No due dates yet.", "No recent activity." |
| L | "Overdue" (badge) |
| S | "Undo", "Undone.", "Unable to save changes." |

## 7. Privacy — `src/app/(public)/privacy/page.tsx`

| Type | String |
|------|--------|
| H | "Privacy Policy" |
| H | "Overview", "Information we collect", "How we use information" |
| L | "Last updated: 2026-02-19" |
| P | (Static prose — full page translation candidate) |

## 8. Terms — `src/app/(public)/terms/page.tsx`

| Type | String |
|------|--------|
| H | "Terms of Service" |
| H | "Agreement", "Accounts and access", "Acceptable use", "Events and registrations" |
| L | "Last updated: 2026-02-19" |
| P | (Static prose — full page translation candidate) |

## 9. Admin Dashboard — `src/app/(admin)/admin/page.tsx`

| Type | String |
|------|--------|
| H | "Admin Dashboard" |
| D | "Operations overview and shortcuts." |
| N | "Manage events", "Manage service offers" |
| N | "Open intake triage queue", "Open commercial operations" |
| N | "Open audit log viewer" |

## 10. Admin Events — `src/app/(admin)/admin/events/page.tsx`

| Type | String |
|------|--------|
| H | (via PageShell title) |
| L | Form labels for event creation/editing |
| L | Status filters, sort controls |
| B | Event CRUD actions |
| S | Loading, empty, and error states |

---

## Extraction Strategy (Future Sprint)

1. Create `locales/en-US.json` with nested key structure:
   ```json
   {
     "home": { "heading": "The Ordo method", ... },
     "events": { "title": "Events", ... },
     "login": { "title": "Login", ... }
   }
   ```

2. Install `next-intl` or similar i18n framework.

3. Replace hardcoded strings with `t("key")` calls.

4. Static prose pages (Privacy, Terms) are better served by full-page markdown translations.

5. Total estimated translatable strings: ~150 across 10 pages.
