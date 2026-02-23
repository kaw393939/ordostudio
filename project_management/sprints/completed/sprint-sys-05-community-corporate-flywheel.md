# Sprint SYS-05 — Community Events + Corporate Intake + Flywheel Tracking

## Goal
Implement the EverydayAI community event registration flow, corporate training intake pipeline, and tracking metrics for the community-to-commercial flywheel.

## Prerequisites
- Sprint IP-07 (EverydayAI Flywheel) — program specs, packages, flywheel model
- Sprint SYS-01 (Seed Events) — events infrastructure populated

## Scope

### Community Event Registration
- New event type/tag: `COMMUNITY` (vs. `WORKSHOP`, `TEAM_PROGRAM`, etc.)
- Community events are free (price = 0)
- Simplified registration: name + email + optional organization
- No login required for community event registration
- Confirmation email with event details
- Add registrant to newsletter subscriber list (with consent checkbox)
- Community events visible on `/events` with distinct visual treatment (free badge)

### Corporate Training Intake
- Enhanced intake form at `/services/request` with corporate package selection:
  - Package selector: Starter ($2K) / Professional ($5K) / Enterprise ($10K) / Custom
  - Company name, size, industry
  - Number of participants
  - Goals and timeline
  - Current AI adoption level (none / experimenting / some production / scaling)
- Submission creates an intake request in the existing pipeline
- Auto-tag with package tier for pipeline prioritization
- Confirmation email with expected next steps and timeline

### Town Hall Event Type
- Recurring event support: mark an event as "recurring" with frequency
- Town Hall template: free, virtual, 1-hour format
- Registration + calendar invite (ICS export already exists in the system)
- Recording link field (added post-event)
- Attendees auto-added to newsletter subscribers (with consent)

### Flywheel Metrics Dashboard (Admin)
New admin section or dashboard widget tracking the flywheel:
- **Community metrics:** total participants, events held, repeat attendees
- **Conversion metrics:** community → newsletter subscriber, community → corporate inquiry, community → apprentice applicant
- **Corporate metrics:** inquiries, packages sold, revenue by package tier
- **Apprentice pipeline:** applicants, active apprentices, level distribution, placements
- Use existing `measurement_events` table with new event types
- Simple table/card layout (Krug: avoid chart junk)

### Referral Source Tracking
- When someone registers for an event, track referral source:
  - Direct, newsletter, community event attendee, corporate contact, referral code
- Add `referral_source` to event registration if not already present
- Use existing `referral_codes` and `referral_clicks` infrastructure where applicable

## Technical Work
- Event type/tag system (new field or use existing metadata)
- Simplified community registration form
- Enhanced corporate intake form with package selection
- Admin flywheel dashboard (new page in admin panel)
- Recurring event support (if not already present)
- New measurement event types for flywheel tracking
- Referral source tracking on registrations

## Acceptance Criteria
- [ ] Community events are bookable with simplified free registration
- [ ] Corporate intake form includes package selection and company details
- [ ] Town Hall events work with recurring format
- [ ] Flywheel dashboard shows community → corporate → apprentice metrics
- [ ] Referral source tracked on registrations
- [ ] Newsletter auto-subscribe works with consent
- [ ] All existing tests pass + new tests for registration flows
- [ ] Lint/build clean

## End-of-Sprint Verification
```bash
npx vitest run
npx eslint .
npx next build
```

## Exit Gate
The full community-to-commercial pipeline is instrumented and measurable.
