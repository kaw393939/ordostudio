# Studio Ordo — AI Intake Agent & CRM Overview

**Status:** Planning · **Date:** 2026-02-25

This folder maps out the full conversational intake agent and CRM system before implementation begins. The goal is to define the data model, product interactions, and extensibility contract up front, then execute sprint by sprint.

---

## The Problem Being Solved

Studio Ordo is a high-trust, high-touch business. The current site drops a prospective client into a form with no context and no warmth. There is no qualification layer, no relationship initiation, and no handoff story. Staff has no unified view of who a prospect is across sessions.

The intake agent system replaces that cold form with a conversation — a "shopkeeper" who already knows the business, can answer questions, and qualifies the prospect in natural dialogue. The intake record is a by-product of the conversation, not a separate step.

---

## The Core Flow

```
Prospect arrives at site
  → Clicks "Talk to us" (or arrives via /apply)
  → Chat widget opens
  → Agent introduces Studio Ordo, asks what they're trying to accomplish
  → Agent answers questions (RAG over site content + site_settings)
  → Agent qualifies: goals, budget signal, timeline, fit
  → Agent submits intake record (calls POST /api/v1/intake internally)
  → Transcript is attached to the intake record
  → Agent offers to book a slot with a Maestro
  → Staff sees full contact record in CRM, processes approval
  → Approval triggers onboarding workflow
  → Customer gets account + guided onboarding
  → Post-onboarding events route through the workflow engine
```

The customer never logs in until they have been approved. Login and registration are in the footer — the public site is a qualification surface, not a portal.

---

## System Architecture

```
┌────────────────────────────────────────────────────────────┐
│                       Public Site                          │
│  /apply, homepage  →  Chat Widget  →  POST /api/v1/agent/chat │
└────────────────────────────────────────────────────────────┘
                             │
                     Streaming AI endpoint
                    (tool-calling over MCP)
                             │
              ┌──────────────┼──────────────┐
              │              │              │
          RAG search     site_settings   POST /api/v1/intake
         (/content/)    (phone, email)   (submit intake form)
                                              │
                                    ┌─────────────────┐
                                    │  intake_record  │
                                    │  + transcript   │
                                    └─────────────────┘
                                              │
                                       Staff CRM view
                                    (contacts + pipeline)
                                              │
                                    Approve → account created
                                              │
                                    Onboarding workflow sequence
                                              │
                                    Workflow routing engine
                                    (trigger/condition/action)
```

---

## Data Model — New Tables

### `site_settings`
Key/value store for operator-configurable values (phone number, email, addresses, social handles, etc.).

### `contacts`
A prospect exists as a `contact` before they ever have a user account. Prevents ghost account pollution. Lifecycle: `LEAD → QUALIFIED → ONBOARDING → ACTIVE → CHURNED`.

### `intake_conversations`
Transcript of the agent conversation, linked to an `intake_requests` record once the agent submits the form. Messages stored as JSON array `{role, content, timestamp}`.

### `maestro_availability`
Slots a Maestro has open for consultations. Status: `OPEN / BOOKED / BLOCKED`.

### `bookings`
Links a contact, an intake record, and a Maestro availability slot. Status: `PENDING / CONFIRMED / CANCELLED`.

### `workflow_rules`
The routing engine. Each rule has a `trigger_event` (matches `feed_events.type`), `condition_json`, `action_type`, and `action_config_json`. When a feed event fires, the engine evaluates matching rules.

---

## Content Architecture

Site content moves into `/content/` as versioned markdown files. The agent does text search over this at query time. Updating a file immediately updates what the agent knows. No CMS required. No vector embeddings required to start.

```
/content/
  site/
    about.md          ← who Studio Ordo is
    services.md       ← what the studio does and costs
    guild.md          ← guild hierarchy explained
    faq.md            ← common prospect questions
    training.md       ← Maestro Training program details
  policies/
    commission.md     ← 20% commission rate, terms
    onboarding.md     ← what new members can expect
```

---

## Privacy & Trust Rules (locked)

1. **No PII in RAG corpus.** The `/content/` folder contains no personal data on members, staff, or past clients.
2. **Transcript stored server-side only.** Never sent to third-party AI providers beyond the message in flight.
3. **Agent never fabricates.** If the answer is not in the RAG corpus or `site_settings`, the agent says "Let me connect you with someone who can answer that" and surfaces the phone number.
4. **Rate limiting on `/api/v1/agent/chat`.** 20 messages per session, 100 sessions per IP per day.

---

## Sprint Plan

| Sprint | Name | Core Deliverable | Prerequisite |
|--------|------|-----------------|--------------|
| 35 | Content + Config Layer | `/content/` files, `site_settings` table, phone # in agent, RAG search endpoint | None |
| 36 | Conversational Intake Agent | Streaming chat, chat widget on `/apply`, RAG responses, transcript → intake | Sprint 35 |
| 37 | CRM Foundation | `contacts` table, staff CRM views, login/register to footer | Sprint 36 |
| 38 | Onboarding Workflow | Approval → account creation → onboarding sequence | Sprint 37 |
| 39 | Workflow Routing Engine | `workflow_rules` table, engine fires on feed events, 4 action types | Sprint 38 |

---

## Approved Language

### The agent's persona
The agent is not a chatbot. It is the "shopkeeper" — knowledgeable, direct, and discerning. It does not over-explain. It asks one question at a time. It does not upsell. Its job is to understand the prospect and determine whether Studio Ordo is the right fit.

### What the agent should NOT do
- Claim capabilities the studio does not have
- Pressure prospects toward a decision in the first message
- Ask for payment information
- Make promises about timelines not established in `/content/`

---

## Design Constraints

- Chat widget must not obscure primary page content (bottom-right floating, or full-page `/apply`)
- Mobile-first — majority of initial traffic arrives via QR-code scans
- No third-party chat embeds (Intercom, Drift, etc.) — agent must be hosted and controlled
- Agent response time target: first token < 800ms

---

## Linked Documents

| Document | Path |
|----------|------|
| Content + Config Layer | [01-content-config.md](./01-content-config.md) |
| Conversational Intake Agent | [02-conversational-agent.md](./02-conversational-agent.md) |
| CRM Foundation | [03-crm-foundation.md](./03-crm-foundation.md) |
| Onboarding Workflow | [04-onboarding-workflow.md](./04-onboarding-workflow.md) |
| Workflow Routing Engine | [05-routing-engine.md](./05-routing-engine.md) |
