# Sprint Persona-01: Membership & Apprenticeship Tools — Architecture

## Role Progression Model

```
SUBSCRIBER
    │ apply_for_apprenticeship()
    ▼
 [pending role_request]
    │ promote_user_role(newRole='ASSOCIATE') ← ADMIN action
    ▼
ASSOCIATE
    │ apply_for_apprenticeship() again
    │ or admin promotes directly
    ▼
 [pending role_request → APPRENTICE]
    │ review_gate_submission() → approve → promote_user_role()
    ▼
APPRENTICE
    │
    ▼
CERTIFIED_CONSULTANT  (highest non-admin rank)
    │
    ▼
ADMIN (not promoteable via tool — DB-only safeguard)
```

## Tool Auth Matrix

| Tool | SUBSCRIBER | ASSOCIATE | APPRENTICE | CERTIFIED | ADMIN/STAFF |
|---|---|---|---|---|---|
| `apply_for_apprenticeship` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `view_rank_requirements` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `list_assigned_tasks` | ✅ (own) | ✅ (own) | ✅ (own) | ✅ (own) | ✅ (any) |
| `get_apprentice_profile` | ✅ (own) | ✅ (own) | ✅ (own) | ✅ (own) | ✅ (any) |
| `review_apprentice_application` | ❌ | ❌ | ❌ | ❌ | ✅ |
| `promote_user_role` | ❌ | ❌ | ❌ | ❌ | ✅ |
| `review_gate_submission` | ❌ | ❌ | ❌ | ❌ | ✅ |
| `list_role_upgrade_requests` | ❌ | ❌ | ❌ | ❌ | ✅ |

## Static Rank Requirements Map

```typescript
const RANK_REQUIREMENTS: Record<string, string[]> = {
  SUBSCRIBER: [
    "Submit an intake request",
    "Attend one free webinar or event",
  ],
  ASSOCIATE: [
    "Complete onboarding intake",
    "Receive ASSOCIATE role assignment from Staff",
  ],
  APPRENTICE: [
    "Complete 3 assigned tasks",
    "Submit a gate submission reviewed by Admin",
  ],
  CERTIFIED_CONSULTANT: [
    "Complete full apprenticeship program",
    "Receive CERTIFIED_CONSULTANT promotion from Admin",
  ],
};
```

## `promote_user_role` Transaction Pattern

```typescript
db.transaction(() => {
  const user = db.prepare("SELECT role FROM users WHERE id = ?").get(userId);
  if (!user) throw new Error("USER_NOT_FOUND");
  if (newRole === "ADMIN") throw new Error("CANNOT_PROMOTE_TO_ADMIN_VIA_TOOL");

  db.prepare("UPDATE users SET role = ? WHERE id = ?").run(newRole, userId);

  db.prepare(`
    INSERT INTO audit_log (id, action, target_id, actor_id, details, created_at)
    VALUES (?, 'ROLE_PROMOTED', ?, ?, ?, datetime('now'))
  `).run(generateId(), userId, actorId, JSON.stringify({ oldRole: user.role, newRole }));
})();
```

## `apply_for_apprenticeship` Duplicate Guard

```sql
SELECT id FROM role_requests
WHERE user_id = :userId
  AND status = 'pending'
LIMIT 1;
-- If row exists → return { error: 'APPLICATION_ALREADY_PENDING' }
```

## File Map

```
src/lib/agent/tools/
  maestro-persona-membership.ts   ← NEW
src/lib/agent/
  maestro-tools.ts                ← MODIFIED (+8 tools)
src/evals/
  persona-membership.eval.ts      ← NEW (5 evals)
src/evals/fixtures/
  membership-seeds.ts             ← NEW
```
