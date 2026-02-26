# Sprint Maestro-01: UX Design Notes

*This sprint has no user-facing UI. Notes are for the API contract only.*

---

## API Contract: POST /api/v1/agent/maestro

```
Request:
POST /api/v1/agent/maestro
Authorization: session cookie (ADMIN or STAFF)
Content-Type: application/json

{
  "message": "What's in my intake queue?",
  "history": [
    { "role": "user", "content": "Any workflow failures?" },
    { "role": "assistant", "content": "One failure in the last 24 hours..." }
  ]
}

Response 200:
{
  "reply": "You have 3 NEW intakes and 1 QUALIFIED intake...",
  "capturedValues": {
    "intake_ids": ["abc123", "def456", "ghi789"]
  }
}

Response 401: { "error": "Unauthorized" }
Response 403: { "error": "Insufficient permissions" }
Response 429: { "error": "Rate limit exceeded" }
Response 500: { "error": "Agent error" }
```

---

## Tool response shapes (for eval harness assertions)

### get_intake_queue
```json
[
  {
    "id": "uuid",
    "contact_name": "Jane Smith",
    "contact_email": "jane@acme.io",
    "audience": "ORGANIZATION",
    "goals_summary": "AI training for 10-person eng team",
    "status": "NEW",
    "created_at": "2026-02-20T..."
  }
]
```

### get_funnel_stats
```json
{
  "window_days": 30,
  "new": 12,
  "triaged": 8,
  "qualified": 5,
  "booked": 3,
  "rejected": 2,
  "closed": 1,
  "qualified_to_booked_rate": 0.6
}
```

### run_health_check
```json
{
  "checks": [
    { "name": "db_migration_version", "status": "pass", "detail": "040" },
    { "name": "users_table_non_empty", "status": "pass", "detail": "3 rows" },
    { "name": "email_provider_configured", "status": "pass", "detail": "console" }
  ],
  "overall": "pass"
}
```

### trigger_test_workflow
```json
{
  "feed_event_id": "uuid",
  "executions": [
    {
      "id": "uuid",
      "rule_name": "Onboarding Notification",
      "status": "SUCCESS",
      "action_type": "CREATE_FEED_EVENT",
      "duration_ms": 12
    }
  ]
}
```
