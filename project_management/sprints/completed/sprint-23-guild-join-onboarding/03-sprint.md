# Sprint 23: Guild Join Onboarding Sprint Plan

## 1. Tasks

### T1: Create `/join` Page Shell
- **File**: `src/app/(public)/join/page.tsx`
- **Action**: Create as `"use client"`. Render:
  ```tsx
  <PageShell
    title="Find Your Path in the Studio."
    subtitle="Answer three questions. See what fits."
  >
    <GuildJoinFlow />
  </PageShell>
  ```
- **Influence note**: Title uses period (Sage voice: declarative, not promotional). Subtitle is
  honest about the mechanic, not the time. No "five minutes" — that's an unverifiable promise.
- **Why**: Establishes the `/join` route and wires in the interactive flow.

---

### T2: Create `GuildJoinFlow` Component
- **File**: `src/components/join/guild-join-flow.tsx`
- **Action**: Create with local state: `step: 1 | 2 | 3 | 'results'`, `answers: Record<'q1'|'q2'|'q3', string>`.
  Render one question card per step (progressive disclosure). On step 3 submit, resolve paths and set
  `step = 'results'`.

  **Progress indicator:** Render dot-based progress (`●──○──○`) at the top of each step card.
  This satisfies Krug: the user always knows where they are without counting questions.

  **Question copy (see `02-ux-design.md` for full wireframe):**
  - Q1: "What describes your situation right now?" — 4 options (q1 values: `craft`, `projects`, `expertise`, `company`)
  - Q2: "What outcome matters most to you?" — 5 options (q2 values: `portfolio`, `earn-grow`, `practice`, `team`, `observe`)
  - Q3: "Where are you in your timeline?" — 3 options (q3 values: `now`, `sorting`, `planning`)

  **Path resolution logic** (pure function, exported separately for testability):
  ```
  q1 === 'craft'      → Apprentice, Observer
  q1 === 'projects'   → Journeyman, Apprentice, Observer
  q1 === 'expertise'  → Maestro Accelerator, Journeyman, Observer
  q1 === 'company'    → Affiliate, Observer
  q2 === 'observe'    → Observer only (override: skip all paid paths)
  Observer            → always rendered last, regardless of q1/q2
  ```

  **Results header copy:**
  ```
  "Here's what we'd suggest."
  "Based on your answers — not a sales pitch."
  ```
  *(Sage + Liking: names the sales anxiety before the visitor can form it.)*

  **CTA URL pattern per card**:
  - Paid paths (apprentice, journeyman, maestro, affiliate): `` `${BOOKING_URL}?path=${pathKey}` ``
  - Observer: `ctaHref = '/newsletter'`, `ctaLabel = 'Follow the Work →'` (no booking URL — Consistency principle: they said they're not ready)

  **q3 → Maestro urgency note:**
  - `q3 === 'now'` → `urgencyNote: 'Cohort forming now — limited by maestro capacity.'`
  - `q3 === 'sorting' || 'planning'` → `urgencyNote: 'Cohort-based · Limited by maestro capacity.'`
  q3 must visibly affect output. Collecting a question with no result effect violates Krug.

- **Why**: Separating flow logic from `page.tsx` makes it unit-testable. The path resolution
  function is business-critical (it determines which high-LTV paths are shown) and must be pure.

---

### T3: Create `GuildPathCard` Subcomponent
- **File**: `src/components/join/guild-path-card.tsx`
- **Action**: Create pure presentational component:
  ```ts
  type GuildPathCardProps = {
    title: string;
    badge: string;
    description: string;
    bullets: string[];
    pathKey: string;
    ctaHref: string;          // required — paid paths use BOOKING_URL?path=key; Observer uses '/newsletter'
    ctaLabel?: string;        // optional — defaults to "Book a Path Consult →"; Observer overrides to "Follow the Work →"
    authorityLine?: string;   // optional — sourced credential or stat (type-meta)
    urgencyNote?: string;     // optional — genuine scarcity only, e.g. cohort note (type-meta)
  }
  ```
  Render a `Card` with: `Badge` → `type-title` heading → `type-body-sm` description → bullet list →
  optional `type-meta` authority/urgency line → `Button` CTA.

  **Swiss constraint:** Exactly 3 type roles used: `type-title`, `type-body-sm`, `type-meta`.
  Bullet copy uses `type-body-sm`. Badge is a UI signifier, not a type role.

  **Influence note per card instance** (copy brief for the initial data object in T2):
  - **Apprentice**: `authorityLine = "23 years · 10,000+ engineers trained."` — Authority (sourced, verifiable)
  - **Journeyman**: no authorityLine; social proof comes from progression narrative
  - **Maestro Accelerator**: `urgencyNote = "Cohort-based · Limited by maestro capacity."` — genuine Scarcity only; add cohort date if known at implementation time
  - **Affiliate**: no urgencyNote; Reciprocity expressed in bullet copy ("your identity stays primary")
  - **Observer**: `urgencyNote = "Join when you're ready. Or don't."` — Reciprocity; removes all pressure

- **Why**: One template for five cards. Optional props let us layer influence signals without
  coupling the component to specific copy.

---

### T4: Add "Join the Studio →" to Footer
- **File**: `src/app/(public)/layout.tsx`
- **Action**: Locate footer nav links. Add between "Studio" and "Sign In":
  ```tsx
  <Link href="/join">Join the Studio →</Link>
  ```
  Use **"Join the Studio"** — this is the official CTA verb from `one-page-brand-sheet.md` (Unity
  principle). Not "Join the Guild" at nav level; guild language is acceptable in body copy once
  context is established, but the tap target must use the registered verb.
- **Why**: Creates a persistent, low-friction entry point from every public page.

---

### T5: Add Tertiary CTA to Studio Page Hero
- **File**: `src/app/(public)/studio/page.tsx` (or the hero component it renders)
- **Action**: Below the primary CTA row, add:
  ```tsx
  <Link
    href="/join"
    className="type-meta text-text-muted hover:text-text-default transition-colors"
  >
    Not sure which path fits you? →
  </Link>
  ```
  This is plain text — no button border, no weight — so it does not interrupt the visual hierarchy
  of the two primary CTAs (Krug + Swiss: every element earns its position).
- **Why**: Captures hesitant visitors into the commitment ladder (/join → path card → consult)
  rather than losing them to bounce. Cialdini — Commitment: lower-barrier alternative to booking.

---

### T6: Write Unit Tests
- **File**: `src/components/join/__tests__/guild-join-flow.test.tsx`
- **Action**: Cover all path resolution cases and UX constraints:
  1. Renders step 1 on initial mount; steps 2 and 3 not in DOM.
  2. "Continue" button is disabled until an answer is selected.
  3. Selecting q1 answer and clicking "Continue" advances to step 2.
  4. Clicking "← Back" on step 2 returns to step 1 with prior answer preserved.
  5. Completing all 3 questions renders the results section.
  6. `q1 = 'craft'` → Apprentice card shown; Maestro card not shown.
  7. `q1 = 'expertise'` → Maestro Accelerator card shown; Apprentice card not shown.
  8. `q1 = 'company'` → Affiliate card shown.
  9. Observer card is in the DOM for every answer combination.
  10. `q2 = 'observe'` → only Observer card shown (override logic).
  11. Each path card CTA `href` contains `BOOKING_URL` and `?path=`.
  12. Maestro card renders `urgencyNote` when provided.
  13. Apprentice card renders `authorityLine` when provided.
- **Why**: Path resolution is business-critical. The override for `q2 = 'observe'` is a branching
  edge case that must be explicitly tested.

---

### T7: Full Verification
- **Action**:
  1. Run `npx vitest run` — all tests pass.
  2. Run `npm run build` — no errors.
  3. Manual: visit `/join` on dev server, complete all three question paths:
     - `craft` flow → see Apprentice + Observer (no Maestro, no Affiliate)
     - `expertise` flow → see Maestro Accelerator + Journeyman + Observer
     - `company` flow → see Affiliate + Observer
  4. Manual: verify footer has "Join the Studio →" on home, studio, and events pages.
  5. Manual: verify Studio page hero has tertiary link below primary CTAs.
  6. Manual: verify Maestro card shows urgency note. Verify no countdown timer exists.
  7. Manual: confirm Observer card copy ends with "Join when you're ready. Or don't."
- **Archetype checklist**: Run `business/studio-ordo/influence-strategy.md §7` checklist against
  all new copy before marking T7 complete.
- **Why**: Final gate. Brand compliance is part of definition of done.

---

## 2. Dependency Graph

```
T3 (GuildPathCard — accepts authorityLine + urgencyNote) ─────────┐
                                                                   ▼
T1 (page.tsx) ──► T2 (GuildJoinFlow, uses T3, populates         T6 (tests) ──► T7 (verify)
                      influence hooks per card) ──────────────────▲
                                                                   │
T4 (footer — "Join the Studio →") ────────────────────────────────┤
T5 (studio tertiary CTA) ─────────────────────────────────────────┘
```

- T3 must exist before T2 (imported dependency).
- T1, T4, T5 are independent and can be done in parallel with T2/T3.
- T6 depends on T2 and T3 existing.
- T7 depends on T6 passing and manual review of brand/influence checklist.
