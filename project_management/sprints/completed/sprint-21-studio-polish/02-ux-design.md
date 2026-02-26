# Sprint 21 — UX Design: Studio Page & Recommended Events

---

## Design Principles Applied

From `docs/swiss-bauhaus-ui-spec.md`:
- **Hierarchy over density** — value prop above fold
- **≤ 3 type roles per card surface** — sidebar event cards
- **Progressive disclosure** — long content behind `<details>`
- **Clarity over decoration** — no decorative hero banners

---

## Before / After: Studio Page (1440px)

### BEFORE
```
┌──────────────────────────────────────────────────────┐
│ Studio Ordo        Training  Events  Studio  Book    │
├──────────────────────────────────────────────────────┤
│                                                      │
│  Studio                                              │
│  Not a certificate. A portfolio of shipped work.     │
│                                                      │
│ ┌──────────────────────────────────────────────────┐ │
│ │                                                  │ │
│ │          [GIANT 1536×1024 HERO IMAGE]            │ │
│ │          notebook + pencil on dark desk           │ │
│ │          ~70% of viewport                        │ │
│ │                                                  │ │
│ └──────────────────────────────────────────────────┘ │
│                                                      │
│  ── scroll to see anything useful ──                 │
```

### AFTER
```
┌──────────────────────────────────────────────────────┐
│ Studio Ordo        Training  Events  Studio  Book    │
├──────────────────────────────────────────────────────┤
│                                                      │
│  Studio                                              │
│  Not a certificate. A portfolio of shipped work.     │
│                                                      │
│ ┌────────────────────────────────┬─────────────────┐ │
│ │ The Studio Apprenticeship      │                 │ │
│ │                                │  [256×256 img]  │ │
│ │ 12–18 months. 4 levels.        │  artifact photo │ │
│ │ 8 gate projects.               │                 │ │
│ │                                │                 │ │
│ │ [Book a Technical Consult]     │                 │ │
│ │  Get the Context Pack →        │                 │ │
│ └────────────────────────────────┴─────────────────┘ │
│                                                      │
│ ┌──────────────────────────┐ ┌───────────────────┐   │
│ │ The bottega model...     │ │ Recommended events│   │
│ │ (always visible)         │ │ ┌───────────────┐ │   │
│ │                          │ │ │ Feb 28 · 3 PM │ │   │
│ │ ▶ Alex's story           │ │ │ Workshop title │ │   │
│ │   (collapsed)            │ │ │ [View details] │ │   │
│ │                          │ │ └───────────────┘ │   │
│ │ Four levels...           │ │ ┌───────────────┐ │   │
│ │ Level cards (no salary)  │ │ │ Mar 5 · 10 AM │ │   │
│ │                          │ │ │ Another event  │ │   │
│ │ ▶ Eight projects...      │ │ │ [View details] │ │   │
│ │ ▶ Market readiness...    │ │ └───────────────┘ │   │
│ └──────────────────────────┘ └───────────────────┘   │
│                                                      │
│  Ready to see if the studio is right for you?        │
│  [Book a Technical Consult]  Context Pack →          │
└──────────────────────────────────────────────────────┘
```

---

## Before / After: Sidebar Event Card

### BEFORE (3 type roles + badge + 2 links)
```
┌──────────────────────────────────┐
│ Lighthouse Open Event  [Recommended] │
│ Wed, Aug 12 · 10:00 AM – 11:00 AM   │
│ Online                               │
│                                      │
│ Attend    Submit report              │
└──────────────────────────────────┘
```

Problems:
- "Recommended" badge = redundant (section says it)
- "Attend" = misleading (goes to detail, not registration)
- "Submit report" = noise for 95% of visitors
- "Online" = low-value repeated info
- Date shows Aug 12 from seed data, not real upcoming

### AFTER (3 type roles, single action)
```
┌──────────────────────────────────┐
│ Wed, Feb 28 · 3:00 PM – 4:00 PM │   ← date line (type-meta)
│ Workshop Title Here              │   ← title link (type-label)
│ [View details →]                 │   ← single clear action
└──────────────────────────────────┘
```

Changes:
- Date line first (matches EventCard pattern from Sprint 20)
- Title as link (consistent with event-card.tsx)
- Single "View details →" link — no badge, no "Submit report"
- Delivery mode removed (low value)

---

## Before / After: Alex's Journey

### BEFORE
7 timeline entries fully visible, ~35 lines of body text, no collapse.

### AFTER
```
▶ Alex's story — from junior developer to Maestro Candidate
   (click to expand)

  ┌─────────────────────────────────────────────────────┐
  │ Month 1 → Month 3 → Month 6 → Month 10 →          │
  │ Month 14 → Month 18 → Today                        │
  │                                                     │
  │ Full narrative text per stage...                     │
  └─────────────────────────────────────────────────────┘
```

Uses same `<details>` pattern as Gate Projects and Role Readiness sections.

---

## Before / After: Level Cards

### BEFORE
Shows: Number, Badge, Description, Gate projects, Spell Book terms, Human Edge focus, Salary range

### AFTER  
Shows: Number, Badge, Description, Gate projects, Spell Book terms, Human Edge focus
Removed: Salary range (moved to Role Readiness collapsible only)

---

## Mobile (375px) Considerations

- Hero removal helps mobile even more — the 1536×1024 image was massive on mobile
- Sidebar stacks below main content on mobile (`lg:grid-cols-[1fr_300px]` → single column)
- Collapsible sections (`<details>`) work natively on mobile without JS
- Sidebar event cards should remain Card-based (touch-friendly padding)

---

## Component Extraction Plan

| Current monolith section | Extract to | Reason |
|---|---|---|
| Bottega Model (lines 116–145) | Inline (short, no reuse) | Keep in page |
| Alex's Journey (lines 147–189) | Inline `<details>` block | Just wrap existing markup |
| Level Cards (lines 196–241) | `studio-levels.tsx` | Reusable on other pages, testable |
| Gate Projects (lines 244–271) | `studio-gate-projects.tsx` | Separate data from presentation |
| Role Readiness (lines 273–316) | Already collapsible, keep inline | Short |
| CEO of Agents (lines 318–340) | Inline (short, no reuse) | Keep in page |
| Recommended Events sidebar | Already extracted (`recommended-events.tsx`) | Refactor internals |
