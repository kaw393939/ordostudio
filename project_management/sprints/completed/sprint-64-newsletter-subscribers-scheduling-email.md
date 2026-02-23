```markdown
# Sprint 64 — Public Newsletter Subscriptions + Scheduled Sending + Delivery Logs

## Shipped
- DB: migration `021_newsletter_subscribers_sending` (subscribers, send runs, delivery events, `scheduled_for` on issues).
- Public UI: `/newsletter` subscribe form + `/newsletter/unsubscribe` confirmation.
- Public API: `POST /api/v1/newsletter/subscribe`, `POST /api/v1/newsletter/unsubscribe`.
- Admin: schedule send + view send runs on `/admin/newsletter/[id]` via `POST /api/v1/admin/newsletter/[id]/schedule` and `GET /api/v1/admin/newsletter/[id]/send-runs`.
- Background runner: `appctl newsletter dispatch-due` sends due runs, writes delivery logs, enforces unsubscribe.
- Provider: `NEWSLETTER_EMAIL_PROVIDER=console|postmark` (Postmark via `POSTMARK_SERVER_TOKEN` + `NEWSLETTER_FROM_EMAIL`).
- Tests: `src/app/__tests__/e2e-newsletter-sending.test.ts` covers subscribe/unsubscribe + scheduling guardrail + dispatch enforcement.

## Goal
Turn the newsletter into a real public channel: anyone can subscribe, issues can be scheduled and sent via transactional email with delivery logs and unsubscribe.

## Scope

### Subscriber model
- Create `newsletter_subscribers`:
  - `id`, `email`, `status` (ACTIVE/UNSUBSCRIBED)
  - timestamps
  - unsubscribe token (or signed token approach)

### Public UI
- Subscribe form (simple, anti-hype).
- Unsubscribe link and confirmation page.

### Sending model
- Create `newsletter_send_runs`:
  - `id`, `issue_id`, `scheduled_for`, `sent_at`
  - counts: attempted/sent/bounced
- Create `newsletter_delivery_events`:
  - run_id, email, event_type (DELIVERED/BOUNCED/COMPLAINT)

### Scheduling
- Add `scheduled_for` to issues.
- Background job runner executes sends.

### Provider
- Select email provider (SES/Postmark/SendGrid) and integrate via API.

### Admin UI
- Schedule send + view send runs and basic deliverability.

## Acceptance Criteria
- [x] Anyone can subscribe and unsubscribe.
- [x] Admin can schedule a send for an issue.
- [x] Send runs are logged and visible.
- [x] Unsubscribe is enforced.
- [x] Tests cover: subscribe/unsubscribe + scheduling guardrails.
- [x] Lint/tests/build pass.


```