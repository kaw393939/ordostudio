# Sprint Prospect-Agent — Tool Specs

File: `src/lib/api/agent-tools.ts` (append to existing `AGENT_TOOLS` array)

---

## Tool 1: `subscribe_to_newsletter`

```typescript
const SubscribeToNewsletterInput = z.object({
  email:  z.string().email().describe("Visitor's email address"),
  source: z.string().max(50).optional()
           .describe("Origin hint: 'chat'|'landing'|'referral' — defaults to 'chat'"),
});
```

**Logic:**
```typescript
// 1. Check for existing subscriber
const existing = db.prepare(
  "SELECT id, status FROM newsletter_subscribers WHERE email = ?"
).get(args.email);

if (existing) {
  return { subscriberId: existing.id, status: existing.status, isNew: false };
}

// 2. INSERT new subscriber
const id = generateId();
db.prepare(`
  INSERT INTO newsletter_subscribers (id, email, source, status, created_at)
  VALUES (?, ?, ?, 'active', datetime('now'))
`).run(id, args.email, args.source ?? 'chat');

writeFeedEvent(db, { type: 'NewNewsletterSubscriber', metadata: { email: args.email } });

return { subscriberId: id, status: 'active', isNew: true };
```

**Returns:**
```typescript
{ subscriberId: string; status: 'active' | 'unsubscribed'; isNew: boolean }
```

---

## Tool 2: `convert_subscriber_to_lead`

```typescript
const ConvertSubscriberToLeadInput = z.object({
  subscriberId:   z.string().min(1).describe("ID from subscribe_to_newsletter"),
  intakeContext:  z.string().max(1000).optional()
                   .describe("Summary of what the user expressed interest in"),
});
```

**Logic:**
```typescript
// 1. Check subscriber exists
const sub = db.prepare(
  "SELECT id, email FROM newsletter_subscribers WHERE id = ?"
).get(args.subscriberId);
if (!sub) return { error: 'SUBSCRIBER_NOT_FOUND' };

// 2. Check for existing open intake for this email
const existing = db.prepare(`
  SELECT id FROM intake_requests
  WHERE email = ? AND status NOT IN ('CLOSED','REJECTED')
  LIMIT 1
`).get(sub.email);
if (existing) return { intakeId: existing.id, isNew: false };

// 3. Create intake
const intakeId = generateId();
db.prepare(`
  INSERT INTO intake_requests (id, email, status, notes, source, created_at)
  VALUES (?, ?, 'NEW', ?, 'chat_agent', datetime('now'))
`).run(intakeId, sub.email, args.intakeContext ?? 'Converted from newsletter subscription via chat');

writeFeedEvent(db, { type: 'NewIntakeFromChat', metadata: { subscriberId: sub.id, intakeId } });

return { intakeId, isNew: true };
```

---

## Tool 3: `capture_content_interest`

```typescript
const CaptureContentInterestInput = z.object({
  topics: z.array(z.string().max(80)).min(1).max(10)
            .describe("Content topics the user expressed interest in"),
  sessionId: z.string().optional()
              .describe("Current session ID for anonymous interest tracking"),
});
```

**Logic:** Upserts a JSON array of topics against the session or user in
`intake_conversations.metadata`. This is a lightweight preference signal — no
dedicated table needed for V1.

```typescript
// If there's an open conversation for this session, update its metadata
const conv = db.prepare(
  "SELECT id, metadata_json FROM intake_conversations WHERE session_id = ? ORDER BY created_at DESC LIMIT 1"
).get(args.sessionId);

if (conv) {
  const meta = JSON.parse(conv.metadata_json ?? '{}');
  meta.content_interests = [...new Set([...(meta.content_interests ?? []), ...args.topics])];
  db.prepare(
    "UPDATE intake_conversations SET metadata_json = ? WHERE id = ?"
  ).run(JSON.stringify(meta), conv.id);
}

return { captured: args.topics, sessionTracked: !!conv };
```

**Returns:** `{ captured: string[]; sessionTracked: boolean }`
