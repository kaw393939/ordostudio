# Sprint 24: CTA Audit Fixes — Sprint Plan

## 1. Tasks

### T1: Fix Homepage §01 Headline
- **File:** `src/app/(public)/page.tsx`
- **Action:** Locate the Section 01 `<h2>` tag. Change:
  ```tsx
  // Before
  <h2 className="mt-2 type-title text-text-primary">The Double Stripping is here.</h2>

  // After
  <h2 className="mt-2 type-title text-text-primary">AI is automating execution. What remains is direction.</h2>
  ```
- **Why:** Replaces jargon with a statement of fact readable without prior context.

---

### T2: Fix Homepage §02 Heading + Body + CTA
- **File:** `src/app/(public)/page.tsx`
- **Action:** Three edits in the Section 02 block:

  **2a — Heading:**
  ```tsx
  // Before
  <h2 className="mt-2 type-title text-text-primary">The 40/60 Split</h2>

  // After
  <h2 className="mt-2 type-title text-text-primary">The 40/60 Method</h2>
  ```

  **2b — Body first sentence:**
  ```tsx
  // Before
  <p className="mt-2 type-body-sm text-text-secondary">
    A 90-day high-intensity transformation. We use a 40/60 split: 40% manual understanding (The Canon, reading code, writing specs) and 60% agentic execution (Cursor, Copilot, Claude). You learn to govern the AI that writes the code.
  </p>

  // After
  <p className="mt-2 type-body-sm text-text-secondary">
    40% manual understanding. 60% AI-directed execution. Every Studio Ordo engagement — training or client work — runs on this ratio. You learn to govern the AI that writes the code.
  </p>
  ```

  **2c — CTA link:**
  ```tsx
  // Before
  <Link href="/services/request" className="type-label underline">
    Hire an Associate →
  </Link>

  // After
  <Link href="/services/request" className="type-label underline">
    Commission a project →
  </Link>
  ```

- **Why:** "The 40/60 Method" matches the locked content spec. Body removes bootcamp language and front-loads the definition. CTA retires the "Hire an Associate" label.

---

### T3: Update `/join` Page Metadata
- **File:** `src/app/(public)/join/page.tsx`
- **Action:**
  ```tsx
  // Before
  export const metadata = buildMetadata({
    title: "Find Your Path",
    description:
      "Three questions to find your path in Studio Ordo — Apprentice, Journeyman, Maestro Accelerator, Affiliate, or Observer.",
    canonical: "/join",
  });

  // After
  export const metadata = buildMetadata({
    title: "Find Your Path",
    description:
      "What brings you here? Three choices. Immediate routing to the right place.",
    canonical: "/join",
  });
  ```
- **Why:** Old description describes the retired 5-path wizard. New description matches the 3-button target state.

---

### T4: Audit `HomeHero` Component (read only — no change)
- **File:** `src/components/experiments/home-hero.tsx`
- **Action:** Read the component. Document what hero copy it currently renders — headline, subhead, CTA labels. Add findings to a note in this sprint folder (`notes.md`). Do NOT modify the component this sprint — hero rebuild is Sprint 28.
- **Why:** Sprint 28 needs a clear picture of what currently exists before rewriting. Doing the read now means Sprint 28 can start immediately.

---

### T5: Verify + Build
- **Action:**
  1. `npx vitest run` — all tests pass.
  2. `npm run build` — no errors.
  3. Manual: visit `/` on dev server — confirm §01 headline, §02 heading, §02 body, §02 CTA are all updated.
  4. Manual: visit `/join` — check the meta description in page source.

---

## 2. Dependency Graph

```
T1 (§01 headline) ─────────────────────┐
T2 (§02 heading + body + CTA) ─────────┼──► T5 (verify)
T3 (/join metadata) ───────────────────┘
T4 (HomeHero read — no write) ─────────► feeds Sprint 28
```

All T1–T4 are independent edits. None depend on each other. Can be done in any order.
