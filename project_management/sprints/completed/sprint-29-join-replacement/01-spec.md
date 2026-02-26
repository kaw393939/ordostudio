# Sprint 29: `/join` Replacement — Wizard to Three Buttons

## 1. Problem Statement

`/join` currently runs a multi-step wizard (`GuildJoinFlow`) that asks visitors a series of questions and routes them based on answers. The wizard has:
- 276 lines of state-routing logic
- 3 questions with branching option arrays
- Progress dots
- A result card for "Corporate Affiliate" (removed concept)
- An "observer" result path (no product to route to)
- `resolvePaths()` function determining what CTA to show

From `GA-03-guild-member-flow.md`:
> "The wizard creates friction on a page that should have zero friction. The visitor already knows what they want. They don't want to answer questions to get permission to click a link."

The three valid outcomes are already known:
1. **I need something built** → `/studio`
2. **I want to learn this method** → `/maestro`
3. **I want to join the guild** → `/apply`

None of these require a wizard. All of them require a button.

**Sprint 29 depends on:**
- Sprint 25 (`/maestro` exists — button 2 must route somewhere)
- Sprint 27 (`/studio` rewritten as buyer-facing — button 1 must route to the clean page)

Sprint 30 (`/apply` index) can be soft-dependent — `/apply` may 404 until Sprint 30 is done. The button can still be added in Sprint 29 because Sprint 30 immediately follows.

---

## 2. Acceptance Criteria

| # | Criterion |
|---|-----------|
| 1 | `/join` returns 200. |
| 2 | Page heading: `"What brings you here?"` |
| 3 | Button 1: `"I need something built"` → `/studio`. |
| 4 | Button 2: `"I want to learn this method"` → `/maestro`. |
| 5 | Button 3: `"I want to join the guild"` → `/apply`. |
| 6 | Each button has a 2-line-max description beneath it. |
| 7 | `GuildJoinFlow` wizard component is removed from the page (state machine, progress dots, Q1/Q2/Q3 arrays, `resolvePaths()`). |
| 8 | `GuildJoinFlow` Q1 `"company"` option removed. |
| 9 | Corporate Affiliate result card removed. |
| 10 | Observer result path removed. |
| 11 | `BOOKING_URL?path=affiliate` is removed from the wizard (if it exists). |
| 12 | `npm run build` succeeds and all tests pass. |

---

## 3. Decisions

1. **No state machine.** Three static buttons. Each button routes unconditionally to its destination. No conditional rendering based on previous selections. No wizard.

2. **Two-line descriptions under each button.** From `04-join.md`: each option gets one clarifying sentence that confirms the visitor is in the right place. Not a marketing pitch — a confirmation. "Building an AI-assisted tool or internal product." / "The Maestro course on directing AI in software work." / "Apprentice, Journeyman, or Affiliate — the studio's professional guild."

3. **`GuildJoinFlow` component can be quarantined, not force-deleted.** If `GuildJoinFlow` is imported elsewhere (e.g., admin or onboarding), keep the file. Remove it from the `/join` page route only. The spec calls for removing specific sub-options (Q1 "company", Corporate Affiliate card, observer card, `BOOKING_URL?path=affiliate`) from within `GuildJoinFlow.tsx` as a separate cleanup task — those may have side effects for other uses.

4. **`/join` page becomes a server component.** No state required. No client-side logic. The three destinations are static. Remove `"use client"` from the page file if it exists only for the wizard.

5. **Page subtitle optional.** If a subtitle is needed for context: `"We have three kinds of work here."` One sentence. Not required if the three buttons are self-explanatory.
