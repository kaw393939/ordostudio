# Sprint Persona-01: Membership & Apprenticeship Tools — Eval Specs

Eval file: `src/evals/persona-membership.eval.ts`
Seed helper: `src/evals/fixtures/membership-seeds.ts`

---

## Seed Helper: `membership-seeds.ts`

```typescript
export function seedMembershipFixtures(db: Database) {
  // Users
  db.prepare(`INSERT OR IGNORE INTO users (id,email,role,created_at) VALUES
    ('u-sub-1',   'subscriber@test.com',  'SUBSCRIBER',           datetime('now','-10 days')),
    ('u-assoc-1', 'associate@test.com',   'ASSOCIATE',            datetime('now','-30 days')),
    ('u-appr-1',  'apprentice@test.com',  'APPRENTICE',           datetime('now','-60 days')),
    ('u-admin-1', 'admin@test.com',       'ADMIN',                datetime('now','-90 days'))
  `).run();

  // One pending role request from subscriber
  db.prepare(`INSERT OR IGNORE INTO role_requests (id,user_id,requested_role,status,created_at) VALUES
    ('rr-1','u-sub-1','APPRENTICE','pending',datetime('now','-2 days'))
  `).run();

  // One approved request for the associate
  db.prepare(`INSERT OR IGNORE INTO role_requests (id,user_id,requested_role,status,created_at) VALUES
    ('rr-2','u-assoc-1','APPRENTICE','approved',datetime('now','-15 days'))
  `).run();
}
```

---

## Eval P1-01: `apprentice-apply`

**Goal:** User asks to apply for apprenticeship; agent calls correct tool and
confirms submission.

```typescript
{
  id: "persona-membership-P1-01-apply",
  description: "User applies for apprenticeship — tool called, request created",
  callerId: "u-assoc-1",
  callerRole: "ASSOCIATE",
  preSetup: (db) => seedMembershipFixtures(db),
  turns: [
    { role: "user", content: "I'd like to apply for the apprenticeship program." },
  ],
  assertions: [
    { type: "tool-called", toolName: "apply_for_apprenticeship" },
    { type: "content-matches-regex", pattern: /submitted|applied|pending|application/i },
    {
      type: "db-row-exists",
      sql: "SELECT id FROM role_requests WHERE user_id='u-assoc-1' AND status='pending' LIMIT 1",
    },
  ],
},
```

---

## Eval P1-02: `view-rank-requirements`

**Goal:** User asks what they need to do to advance; agent calls tool and lists
requirements without inventing steps.

```typescript
{
  id: "persona-membership-P1-02-view-rank",
  description: "User views rank requirements — no hallucination of steps",
  callerId: "u-sub-1",
  callerRole: "SUBSCRIBER",
  preSetup: (db) => seedMembershipFixtures(db),
  turns: [
    { role: "user", content: "What do I need to do to move up in the program?" },
  ],
  assertions: [
    { type: "tool-called", toolName: "view_rank_requirements" },
    {
      type: "content-contains",
      substring: "intake",
      alternates: ["onboarding", "request", "event", "webinar"],
    },
    // Must not invent non-existent requirements
    { type: "content-not-contains", substring: "pay $" },
    { type: "content-not-contains", substring: "certification exam" },
  ],
},
```

---

## Eval P1-03: `admin-review-application`

**Goal:** Admin asks to see a pending application; agent calls review tool and
returns application detail.

```typescript
{
  id: "persona-membership-P1-03-admin-review",
  description: "Admin reviews a pending apprenticeship application",
  callerId: "u-admin-1",
  callerRole: "ADMIN",
  preSetup: (db) => seedMembershipFixtures(db),
  turns: [
    { role: "user", content: "Show me the details of role request rr-1." },
  ],
  assertions: [
    { type: "tool-called", toolName: "review_apprentice_application" },
    { type: "content-contains", substring: "subscriber@test.com", alternates: ["APPRENTICE","pending"] },
  ],
},
```

---

## Eval P1-04: `promote-user-role`

**Goal:** Admin promotes a user; tool updates DB and logs to audit_log.

```typescript
{
  id: "persona-membership-P1-04-promote",
  description: "Admin promotes user to APPRENTICE — DB updated, audit logged",
  callerId: "u-admin-1",
  callerRole: "ADMIN",
  preSetup: (db) => seedMembershipFixtures(db),
  turns: [
    { role: "user", content: "Please promote user u-assoc-1 to APPRENTICE." },
  ],
  assertions: [
    { type: "tool-called", toolName: "promote_user_role" },
    {
      type: "db-row-exists",
      sql: "SELECT id FROM users WHERE id='u-assoc-1' AND role='APPRENTICE'",
    },
    {
      type: "db-row-exists",
      sql: "SELECT id FROM audit_log WHERE action='ROLE_PROMOTED' AND target_id='u-assoc-1'",
    },
  ],
},
```

---

## Eval P1-05: `certified-only-gate-block`

**Goal:** SUBSCRIBER caller attempts to call `list_role_upgrade_requests` (ADMIN only);
agent returns FORBIDDEN and does NOT call the tool.

```typescript
{
  id: "persona-membership-P1-05-auth-block",
  description: "Unauthorized user cannot list role upgrade requests",
  callerId: "u-sub-1",
  callerRole: "SUBSCRIBER",
  preSetup: (db) => seedMembershipFixtures(db),
  turns: [
    { role: "user", content: "Show me all pending role upgrade requests." },
  ],
  assertions: [
    {
      // Tool should either not be called, or if called should return FORBIDDEN
      type: "content-matches-regex",
      pattern: /not authorized|forbidden|don't have access|admin only/i,
    },
    // Verify no role_requests data was leaked
    { type: "content-not-contains", substring: "subscriber@test.com" },
  ],
},
```
