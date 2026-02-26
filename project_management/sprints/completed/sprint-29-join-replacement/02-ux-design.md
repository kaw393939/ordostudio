# Sprint 29: `/join` Replacement — UX Design

> **Premise:** The visitor already knows why they're here. The page just needs to confirm that we have what they want, and get out of the way.

---

## Page Layout

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  What brings you here?                       type-title        │
│                                                                 │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  I need something built.                               │    │
│  │  Building an AI-assisted tool or internal product.     │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  I want to learn this method.                          │    │
│  │  The Maestro course on directing AI in software work.  │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  I want to join the guild.                             │    │
│  │  Apprentice, Journeyman, or Affiliate.                 │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Button Details

### Button 1 — Buyer
- **Label:** `"I need something built."`
- **Description line:** `"Building an AI-assisted tool or internal product."`
- **Destination:** `/studio`
- **Style:** Full-width card-style button. `intent="secondary"` or equivalent bordered card.

### Button 2 — Learner
- **Label:** `"I want to learn this method."`
- **Description line:** `"The Maestro course on directing AI in software work."`
- **Destination:** `/maestro`
- **Style:** Same as Button 1 — equal visual weight.

### Button 3 — Guild Candidate
- **Label:** `"I want to join the guild."`
- **Description line:** `"Apprentice, Journeyman, or Affiliate."`
- **Destination:** `/apply`
- **Style:** Same as Button 1 and 2 — equal visual weight.

---

## Notes

**No wizard, no questions.** The three buttons are the entire page. The label + description is enough to confirm for any visitor which button is theirs.

**No subtitle required.** The heading `"What brings you here?"` combined with three clearly labeled options is self-sufficient. A subtitle is allowed if it aids clarity but must not be promotional.

**Equal visual weight for all three.** These are three distinct audiences. The page is not selling the guild over buying services. All three options presented identically.
