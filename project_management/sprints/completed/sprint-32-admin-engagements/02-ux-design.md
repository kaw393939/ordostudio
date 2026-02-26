# Sprint 32: Admin Engagements — UX Design

---

## Engagements Index Page (`/admin/engagements`)

```
┌─────────────────────────────────────────────────────────────────┐
│  Engagements                          [+ New Engagement]        │
│                                                                 │
│  Tabs: [All] [Project Commissions] [Maestro Training]          │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Client / Student    Type       Value    Commission  Status│  │
│  ├─────────────────────────────────────────────────────────┤   │
│  │ Acme Corp           Project    $40,000  $8,000       Actv│   │
│  │ Jane Smith          Maestro    $3,000   —            Comp│   │
│  │ Beta Inc            Project    $25,000  $5,000       Pend│   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Engagement Detail — Project Commission

```
┌─────────────────────────────────────────────────────────────────┐
│  Project Commission — Acme Corp                                 │
│                                                                 │
│  Client:           Acme Corp                                    │
│  Project Type:     Internal Tooling                             │
│  Total Value:      $40,000                                      │
│  Commission (20%): $8,000                                       │
│  Payment Status:   Pending                                      │
│  Referral Code:    KEITH01  (so_ref from application)          │
│                                                                 │
│  [Mark as Completed]                                            │
│                                                                 │
│  → On "Completed": auto-generates:                              │
│    PLATFORM_REVENUE  +$8,000                                    │
│    REFERRER_COMMISSION +$1,600  (20% of $8,000 to KEITH01)     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Engagement Detail — Maestro Training

```
┌─────────────────────────────────────────────────────────────────┐
│  Maestro Training — Jane Smith                                  │
│                                                                 │
│  Student:          Jane Smith                                   │
│  Track:            Cohort ($3,000)                              │
│  Cohort Start:     2026-03-01                                   │
│  Payment Status:   Received                                     │
│  Completion:       [ ] Mark as Completed                        │
│                                                                 │
│  → On "Completed": auto-generates:                              │
│    PLATFORM_REVENUE  +$3,000                                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## New Engagement Form

Two-step form: select type (Project Commission / Maestro Training), then fill type-specific fields.

**Project Commission fields:**
- Client name
- Project type (Internal Tooling / Line-of-Business App / AI Integration / API Dev / Other)
- Total project value ($)
- Commission (auto-calculated at 20%, read-only)
- Referral code (optional — pre-populated from intake if available)
- Notes (textarea, optional)

**Maestro Training fields:**
- Student name / user lookup
- Track (Cohort / Advisory)
- Rate (pre-filled from track: $3,000 cohort / $1,500/mo advisory)
- Cohort start date
- Payment status
