# Sprint Prospect-Agent — QA Checklist

## Tool Validation
- [ ] `subscribe_to_newsletter` with invalid email returns `{ error: 'Invalid email' }` — does not throw
- [ ] `subscribe_to_newsletter` with valid email inserts row
- [ ] Second call with same email returns existing subscriber, `isNew: false`
- [ ] `convert_subscriber_to_lead` with unknown subscriberId returns `{ error: 'SUBSCRIBER_NOT_FOUND' }`
- [ ] `convert_subscriber_to_lead` with existing open intake returns existing ID, `isNew: false`
- [ ] `capture_content_interest` with empty session returns `{ sessionTracked: false }` gracefully

## Feed Events
- [ ] `NewNewsletterSubscriber` written on INSERT, not on duplicate
- [ ] `NewIntakeFromChat` written on intake creation

## DB Consistency
- [ ] `newsletter_subscribers.email` is UNIQUE — no duplicate rows possible
- [ ] `intake_requests` row has `source = 'chat_agent'` for chat-converted leads

## Evals
- [ ] `npm run evals:prospect` → 3/3 PASS
- [ ] `npm run evals` → full suite clean
