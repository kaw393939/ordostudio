# Sprint Maestro-02: Admin Chat UI — UX Design

---

## Page Layout

```
┌─ admin sidebar (existing, ~220px) ─┬─ /admin/chat ─────────────────────────┐
│                                    │                                        │
│  Dashboard                         │ ┌── Ops Summary ──┐ ┌── Chat ───────┐  │
│  Intake                            │ │                  │ │               │  │
│  Roles                             │ │ Intake Queue     │ │ Assistant msg │  │
│  Events                            │ │ ● 3 NEW          │ │ ─────────── │  │
│  Workflows                         │ │ ● 1 TRIAGED      │ │               │  │
│  ──────────                        │ │                  │ │ User msg      │  │
│  ▶ Chat  ← new entry              │ │ Role Requests    │ │ ─────────── │  │
│                                    │ │ ● 2 pending      │ │               │  │
│                                    │ │                  │ │ Assistant msg │  │
│                                    │ │ Workflow Issues  │ │ ─────────── │  │
│                                    │ │ ● 1 failure 24h  │ │               │  │
│                                    │ │                  │ │               │  │
│                                    │ │ Slots            │ │               │  │
│                                    │ │ ● 4 open         │ │               │  │
│                                    │ │                  │ │ [type here…]  │  │
│                                    │ └──────────────────┘ └───────────────┘  │
└────────────────────────────────────┴────────────────────────────────────────┘
```

---

## Chat Message Bubbles

**User message:**
```
┌──────────────────────────────────────────────┐
│                          You  2:34 PM        │
│  ┌──────────────────────────────────────────┐│
│  │ What's in my intake queue?              ││
│  └──────────────────────────────────────────┘│
└──────────────────────────────────────────────┘
```

**Assistant message:**
```
┌──────────────────────────────────────────────┐
│  Ops Agent  2:34 PM                          │
│  ┌──────────────────────────────────────────┐│
│  │ You have **3 NEW** intakes:             ││
│  │                                         ││
│  │ 1. Jane Smith — SoftCorp (ORGANIZATION) ││
│  │ 2. Alex Renn — Individual               ││
│  │ 3. Chris Dao — TechGroup LLC            ││
│  │                                         ││
│  │ 1 intake is QUALIFIED and awaiting...   ││
│  └──────────────────────────────────────────┘│
└──────────────────────────────────────────────┘
```

**Typing indicator (while loading):**
```
  Ops Agent  ···
```

Three animated dots using CSS animation.

---

## Empty / First-load State

When no chat history exists:
```
  ┌─────────────────────────────────────────┐
  │                                         │
  │            Ops Agent                   │
  │                                         │
  │  I'm watching your pipeline. Ask me    │
  │  anything — intake queue, workflow     │
  │  status, marketing funnel, or role     │
  │  approvals.                            │
  │                                         │
  │  Try: "What needs my attention today?" │
  │                                         │
  └─────────────────────────────────────────┘
```

---

## Error State

```
  ┌──────────────────────────────────────────────┐
  │  ⚠  Could not reach the agent.               │
  │  Check your connection and try again.         │
  │  [Retry]                                      │
  └──────────────────────────────────────────────┘
```

---

## Ops Summary Panel Details

Each item is a text link. On click: navigate to the corresponding admin URL.

```
Ops Summary                          [last updated 2:34 PM]

Intake Queue
   3 NEW ──────────────── /admin/intake?status=NEW
   1 TRIAGED ──────────── /admin/intake?status=TRIAGED

Role Requests
   2 pending ──────────── /admin/roles?status=PENDING

Workflow Issues (24h)
   1 failure ──────────── /admin/workflows/executions?status=FAILED

Open Slots
   4 available ─────────── /admin/availability
```

When all counts are zero:
```
  ✓ All clear — nothing pending.
```

---

## Responsive Behavior

- Below 1024px: left panel collapses. Only chat is visible. A small top bar shows a summarized count badge.
- Above 1024px: split layout as designed.

---

## Accessibility

- Chat input: `<textarea>` with `aria-label="Message to Ops Agent"`
- Send button: `aria-label="Send message"`, disabled when input is empty or loading
- Message list: `role="log"` `aria-live="polite"`
- Error banner: `role="alert"`
- Each message timestamp: `<time>` element with ISO datetime attribute
