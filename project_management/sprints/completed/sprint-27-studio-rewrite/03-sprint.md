# Sprint 27: `/studio` Rewrite — Sprint Plan

## 1. Tasks

### T1: Audit Current `/studio` Page File
- **Action:** Read `src/app/(public)/studio/page.tsx` (or wherever the Studio route lives). Identify:
  - Which components are imported and rendered
  - Exact location of `StudioBottegaModel`, `RecommendedEvents`, Bottega narrative, "You're not learning to code" section, "Context Pack" link
  - What props each receives (so you know what's safe to delete vs. what might break)
- **Why:** Before deleting, confirm each removal target. Don't guess at component names.

---

### T2: Remove Guild/Learner Content
- **Files:** `src/app/(public)/studio/page.tsx` and any section sub-components it composes
- **Action:**
  1. Remove `<StudioBottegaModel />` import and render
  2. Remove `<RecommendedEvents />` import and render
  3. Remove the "You're not learning to code" section block
  4. Remove the Bottega/Leonardo/Verrocchio narrative section
  5. Remove `"Get the Context Pack Starter Kit →"` link/button
- **Note:** If these items live in imported sub-components (e.g., `StudioHeroSection.tsx`), remove only the specific section — don't delete entire sub-component files unless they are *only* used for removed content.

---

### T3: Rewrite Hero Section
- **File:** `src/app/(public)/studio/page.tsx` (or `StudioHero.tsx` / equivalent)
- **Action:**
  ```tsx
  <section className="surface p-6">
    <h1 className="type-title text-text-primary">Commission a project.</h1>
    <p className="mt-2 type-body text-text-secondary">
      AI-capable engineers. Spec-driven method. Audit-logged deliverables.
    </p>
    <div className="mt-4">
      <Button asChild intent="primary">
        <Link href="/services/request">Start a project →</Link>
      </Button>
    </div>
  </section>
  ```
- **CTA goes to `/services/request`**, not `/studio/request` or `/contact`.

---

### T4: Add "What We Build" Section
- **Action:**
  ```tsx
  <section className="surface p-6">
    <h2 className="type-section-title text-text-primary">What We Build</h2>
    <ul className="mt-3 space-y-1 type-body-sm text-text-secondary list-disc list-inside">
      <li>Line-of-business web applications</li>
      <li>Internal tooling and workflow automation</li>
      <li>AI-integrated features for existing products</li>
      <li>API development and system integrations</li>
      <li>Codebase audits and spec remediation</li>
    </ul>
  </section>
  ```

---

### T5: Add "Who We Work With" Section
- **Action:**
  ```tsx
  <section className="surface p-6">
    <h2 className="type-section-title text-text-primary">Who We Work With</h2>
    <p className="mt-2 type-body-sm text-text-secondary">
      Engineering directors managing teams building AI-assisted software. CTOs who need a
      reliable external build partner. Product leads with a spec and a deadline.
    </p>
  </section>
  ```

---

### T6: Add Proof Point + "How We Work" Section
- **Action:**
  ```tsx
  <div className="py-4 text-center">
    <p className="type-meta text-text-muted">
      23 years teaching engineers · 10,000+ trained · spec-driven from day one
    </p>
  </div>

  <section className="surface p-6">
    <h2 className="type-section-title text-text-primary">How We Work</h2>
    <p className="mt-2 type-body-sm text-text-secondary">
      We spend 40% of every engagement in spec. That means requirements are locked before a
      line of code is written, and deliverables match what was agreed.
    </p>
    <p className="mt-3 type-body-sm text-text-secondary">
      The remaining 60% is build — AI-capable engineers working against a living spec
      document that you can audit at any point in the engagement.
    </p>
  </section>
  ```

---

### T7: Verify + Build
- **Action:**
  1. `npx vitest run` — no new failures.
  2. `npm run build` — no errors.
  3. Manual: visit `/studio` — confirm no guild content visible, no `StudioBottegaModel`, no `RecommendedEvents`.
  4. Manual: confirm `"Start a project →"` button goes to `/services/request`.
  5. Manual: scan for "Bottega", "Leonardo", "Verrocchio", "Context Pack", "You're not learning" anywhere on the rendered page.

---

## 2. Dependency Graph

```
T1 (audit current page)
     │
     ▼
T2 (remove guild content) ──► T3 (hero rewrite)
                              T4 (what we build)
                              T5 (who we work with)
                              T6 (proof point + how we work)
                              │
                              ▼
                         T7 (verify + build)
```

**Unblocks:** Sprint 28 (Homepage) requires `/studio` to be the clean buyer-facing page before the homepage tile routes there.
