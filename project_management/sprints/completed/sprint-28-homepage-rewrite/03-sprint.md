# Sprint 28: Homepage Rewrite — Sprint Plan

## 1. Tasks

### T1: Read Sprint 24 T4 Audit Findings
- **Action:** Read `project_management/sprints/planning/sprint-24-cta-audit-fixes/03-sprint.md` Task T4 section. It contains the read-only audit of `HomeHero` from Sprint 24 — use those findings here before modifying `HomeHero`.
- **Why:** Sprint 24 T4 was explicitly designed as a preparation task for Sprint 28.

---

### T2: Audit Current Homepage Structure
- **Action:** Read `src/app/(public)/page.tsx` (or wherever the homepage route lives). Identify:
  - Component name for the hero
  - What "Section 03 Canon 3-card block" maps to in the component tree
  - What "Section 04 90-Day Transformation" maps to in the component tree
  - Any other sections currently on the page
- **Why:** Don't remove the wrong sections.

---

### T3: Update `HomeHero` Component
- **File:** Wherever `HomeHero` lives (found in T1 and T2)
- **Action:**
  Update heading, subhead, and tile/CTA structure:
  ```tsx
  <section className="surface p-6">
    <h1 className="type-title text-text-primary">
      Bring order to AI in software delivery.
    </h1>
    <p className="mt-2 type-body text-text-secondary">
      We build software products for engineering teams.{" "}
      We train the directors who lead them.
    </p>
    <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
      <Link
        href="/studio"
        className="surface border-border border rounded p-5 block hover:bg-bg-subtle transition-colors"
      >
        <span className="type-label text-text-primary">Commission a project →</span>
      </Link>
      <Link
        href="/maestro"
        className="surface border-border border rounded p-5 block hover:bg-bg-subtle transition-colors"
      >
        <span className="type-label text-text-primary">Enroll in Maestro →</span>
      </Link>
    </div>
    <p className="mt-4 text-center type-meta text-text-muted">
      23 years teaching engineers · 10,000+ students
    </p>
  </section>
  ```
- **Tile design notes:** Both tiles identical visual weight. No primary/secondary distinction. Two doors, equal prominence.

---

### T4: Remove Section 03 (Canon 3-Card Block)
- **File:** Homepage page component or its sub-components
- **Action:** Remove the Canon 3-card block from the page render. If it's a standalone component import, delete the import and the render call. If it's inline JSX, delete the entire section block.
- **Why:** Guild philosophy content on the homepage confuses buyers and doesn't help learners choose their path.

---

### T5: Remove Section 04 (90-Day Transformation)
- **File:** Homepage page component or its sub-components
- **Action:** Remove the "90-Day Transformation" section from the page render. Same approach as T4.
- **Why:** Learner-journey content that belongs on `/maestro`, not the homepage router.

---

### T6: Verify + Build
- **Action:**
  1. `npx vitest run` — no new failures.
  2. `npm run build` — no errors.
  3. Manual: homepage loads, hero shows two tiles with correct labels and hrefs.
  4. Manual: `"Commission a project →"` tile → `/studio` (not `/services/request`).
  5. Manual: `"Enroll in Maestro →"` tile → `/maestro`.
  6. Manual: Proof point visible below tiles.
  7. Manual: Scroll full page — no Canon 3-card content, no 90-Day content visible.

---

## 2. Dependency Graph

```
T1 (read Sprint 24 audit notes)
T2 (audit homepage structure)
     │                │
     └────────────────┘
               │
               ▼
     T3 (update HomeHero)
     T4 (remove Section 03)
     T5 (remove Section 04)
               │
               ▼
          T6 (verify + build)
```

**Unblocks:** Sprint 29 (`/join`) assumes `/studio` and `/maestro` are both properly wired up as the downstream destinations when a user presses "I need something built" or "I want to learn this method."
