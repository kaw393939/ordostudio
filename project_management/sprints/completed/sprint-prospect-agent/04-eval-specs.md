# Sprint Prospect-Agent — Eval Specs

Eval file: `src/evals/scenarios/prospect.ts`
Eval type: `prospect`

**New evals:** 3
Register type in `src/evals/run.ts`. Add script:
```json
"evals:prospect": "tsx src/evals/run.ts --type prospect"
```

---

## Eval PA-01: `subscribe-captures-email`

```typescript
{
  id: "prospect-PA-01-subscribe",
  type: "prospect",
  description: "Agent captures email subscription via subscribe_to_newsletter",
  turns: [
    {
      role: "user",
      content: "I'd like to stay informed about the program. My email is testlead@example.com",
    },
  ],
  assertions: [
    { type: "tool-called", toolName: "subscribe_to_newsletter" },
    { type: "db-assert", query: "SELECT COUNT(*) as n FROM newsletter_subscribers WHERE email = 'testlead@example.com'", expect: { n: 1 } },
    { type: "content-contains", substring: "subscribed", alternates: ["newsletter", "added", "signed up"] },
  ],
},
```

---

## Eval PA-02: `duplicate-subscribe-graceful`

```typescript
{
  id: "prospect-PA-02-duplicate-subscribe",
  type: "prospect",
  description: "Second subscribe call with same email returns gracefully, no error",
  preSetup: (db) => {
    db.prepare("INSERT INTO newsletter_subscribers (id, email, status, source, created_at) VALUES ('sub-seed-pa02', 'existing@example.com', 'active', 'chat', datetime('now'))").run();
  },
  turns: [
    {
      role: "user",
      content: "Subscribe me to the newsletter: existing@example.com",
    },
  ],
  assertions: [
    { type: "tool-called", toolName: "subscribe_to_newsletter" },
    { type: "db-assert", query: "SELECT COUNT(*) as n FROM newsletter_subscribers WHERE email = 'existing@example.com'", expect: { n: 1 } },
    // No error message in response
    { type: "content-not-contains", substring: "error" },
  ],
},
```

---

## Eval PA-03: `convert-subscriber-to-lead`

```typescript
{
  id: "prospect-PA-03-convert-to-lead",
  type: "prospect",
  description: "Agent converts existing subscriber to an intake lead",
  preSetup: (db) => {
    db.prepare("INSERT INTO newsletter_subscribers (id, email, status, source, created_at) VALUES ('sub-seed-pa03', 'newlead@example.com', 'active', 'chat', datetime('now'))").run();
  },
  turns: [
    {
      role: "user",
      content: "I subscribed as newlead@example.com and I'm interested in the apprenticeship program. Can you start my application?",
    },
  ],
  assertions: [
    { type: "tool-called", toolName: "convert_subscriber_to_lead" },
    { type: "db-assert", query: "SELECT COUNT(*) as n FROM intake_requests WHERE email = 'newlead@example.com' AND status = 'NEW'", expect: { n: 1 } },
    { type: "db-assert", query: "SELECT COUNT(*) as n FROM feed_events WHERE type = 'NewIntakeFromChat'", expect: { n: 1 } },
  ],
},
```
