# RISD Lens — UI/UX Design Review (Navigation + Clarity)

Date: 2026-02-23

This is a design critique written in a product/interaction + visual design lens.

---

## North star

Make the system feel:
- **Quiet** (low cognitive load)
- **Directed** (always a clear next action)
- **Trustable** (money + operations feel safe)
- **Consistent** (patterns repeat across pages)

---

## Primary diagnosis

### 1) Hierarchy collapse from nav stacking
When multiple nav layers (public + admin quick + admin tree) compete vertically, the user’s eye has no dominant anchor.

Design principle:
- There must be **one dominant navigation anchor** per mode.

### 2) Mode confusion (Public vs Admin)
Operators need to know they’re in “Admin mode” instantly.

Design principle:
- Mode should be communicated via layout + label, not by making people infer it.

### 3) Rhythm + density
Current surfaces mix high-density lists with low-density cards. That’s fine, but not if:
- spacing rules vary per page,
- headings don’t consistently establish structure,
- actions move around.

Design principle:
- A small set of reusable page frames is better than bespoke layouts.

---

## What’s working

- Cockpit pattern on Intake/Deals/Ledger is the right direction.
- Badges/status chips improve scanning.
- Progressive disclosure (`details`) reduces default clutter.

---

## What needs to be standardized

### A) Navigation frame (every page)
- One primary header row (brand + global nav)
- Optional secondary header row (contextual tasks)
- Left rail for dense admin IA (desktop)
- Mobile: nav becomes a drawer overlay

### B) Page header grammar
Every page should begin with:
- Title
- One-line purpose
- One obvious primary action or “work queue” selection

### C) Work surfaces
For operator surfaces, default layout should be:
`Queue (left) → Focus (right) → Act → Details`.

---

## Design acceptance criteria (“Krug approved” from a design lens)

- A first-time operator can complete: intake → deal → ledger approval without asking “where is that?”
- On mobile, content is never displaced downward by navigation.
- Visual rhythm: headings, spacing, and action placement are consistent across admin pages.
- The UI never requires reading dense paragraphs to understand next steps.
