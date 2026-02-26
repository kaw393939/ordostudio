# Sprint 28: Homepage Rewrite — QA Checklist

## 1. Hero

- [ ] H1 reads exactly: **"Bring order to AI in software delivery."** (with period)
- [ ] Subhead sentence 1: "We build software products for engineering teams."
- [ ] Subhead sentence 2: "We train the directors who lead them."
- [ ] No additional sentences in the subhead.
- [ ] Two equal-weight tiles rendered below the subhead.
- [ ] Tile 1 reads: **"Commission a project →"** → `/studio`
- [ ] Tile 2 reads: **"Enroll in Maestro →"** → `/maestro`
- [ ] Tiles are visually equal (not primary/secondary button hierarchy).
- [ ] On mobile, tiles stack vertically.

---

## 2. Proof Point

- [ ] Proof point reads approximately: `"23 years teaching engineers · 10,000+ students"`
- [ ] Proof point is below the tiles.
- [ ] Proof point is `type-meta` / muted styling — not competitive with the tile CTAs.

---

## 3. Removed Content — Verify Absent

- [ ] Search rendered page for "Canon" — zero results.
- [ ] Search rendered page for "90-Day" — zero results.
- [ ] Search rendered page for "Transformation" (in a section heading) — zero results.
- [ ] No 3-card block visible anywhere on the page.
- [ ] No "90-Day" journey timeline anywhere on the page.

---

## 4. CTA Routing

- [ ] `"Commission a project →"` → `/studio` (not `/services/request` — that's the Studio page's CTA, not the homepage tile's).
- [ ] `"Enroll in Maestro →"` → `/maestro`.
- [ ] No "Hire an Associate" anywhere on the page.
- [ ] No "Meet the Bottega" anywhere on the page.

---

## 5. Build & Tests

- [ ] `npx vitest run` — no new failures.
- [ ] `npm run build` — completes without errors.
