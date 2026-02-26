# Sprint Prospect-Agent: Top-of-Funnel Automation — Overview

## Status
**NOT STARTED** | Priority: 🟠 P1 | Depends on: Vec-01 complete

---

## One-Liner
Give the public intake chat the ability to convert strangers to leads — capturing
newsletter subscriptions and creating intake requests without the visitor ever
leaving the conversation.

---

## Why This Sprint Exists

Every other sprint in this plan is operator infrastructure. This is the only sprint
that directly improves **revenue growth** by automating the funnel entry point.

Current flow (manual):
1. Visitor reads content → decides to engage
2. Visitor finds newsletter signup form elsewhere on site → subscribes
3. Days later, operator manually imports leads from newsletter provider
4. Operator follows up

Automated flow after this sprint:
1. Visitor is in the intake chat → asks about the program → agent offers to add
   them to the newsletter OR initiate an intake
2. `subscribe_to_newsletter` captures email inline — no form, no navigation
3. `convert_subscriber_to_lead` creates an intake request row immediately
4. Operator sees new intake in the queue within seconds

**This is different from every other sprint.** The ops agent tools help Keith work
faster. These tools help the site grow.

---

## Scope Boundaries

| In scope | Out of scope |
|---|---|
| 3 public-facing agent tools | Email confirmation sending (no SMTP from agent) |
| 3 evals PA-01 through PA-03 | Newsletter platform integration (internal only) |
| Tools in public chat agent (not Maestro) | Subscriber segmentation or tagging UI |

---

## Where These Tools Live

**NOT in `maestro-tools.ts`.** These are PUBLIC route tools — they run in the
existing intake chat (`/api/v1/agent/chat`) that anonymous and authenticated visitors
already use.

File: `src/lib/api/agent-tools.ts` — append 3 new tools to the existing `AGENT_TOOLS` array.

---

## The 3 Tools

| Tool | Auth | What happens |
|------|------|--------------|
| `subscribe_to_newsletter` | PUBLIC | Inserts/upserts `newsletter_subscribers` row |
| `convert_subscriber_to_lead` | PUBLIC / session | Creates `intake_requests` row from subscriber data |
| `capture_content_interest` | PUBLIC / session | Tags the session/user with content preferences |

---

## Outputs Produced

- 3 new tools in `src/lib/api/agent-tools.ts`
- 3 new evals in `src/evals/scenarios/prospect.ts`
- `NewNewsletterSubscriber` and `NewIntakeFromChat` feed events
- DB: no new tables needed (uses `newsletter_subscribers`, `intake_requests`,
  optionally a `contact_interests` JSONB column or separate table)

---

## Estimated Effort

| Role | Hours |
|---|---|
| Backend — tool implementation | 3 h |
| Seed helpers + evals | 2 h |
| Total | 5 h |

---

## Risk

**Low.** Read and INSERT only. No writes touch money or access control.
`subscribe_to_newsletter` is idempotent (upsert on email). Worst case: a duplicate
intake row — mitigated by dedup check in the tool.
