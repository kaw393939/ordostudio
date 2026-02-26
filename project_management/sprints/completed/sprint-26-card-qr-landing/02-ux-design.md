# Sprint 26: `/card` — UX Design

> **Single-purpose page.** One scroll. Two decisions. No navigation pressure.
> **Context:** Visitor has zero prior knowledge of Studio Ordo. They scanned a QR code from a physical card. They are on a phone. 15 seconds of attention maximum before they bounce.

---

## Page Layout

```
[Above fold — two CTAs]
[Below fold — what is this]
```

No sections beyond these two. No nav-heavy layout. The page shell inherits the public layout header/footer, but the content itself is minimal.

---

## 1. Above Fold

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  You're holding a Studio Ordo card.          type-title        │
│                                                                 │
│  We build software. We train the people      type-body-sm      │
│  who direct AI.                                                 │
│                                                                 │
│  [if ?ref resolves to a name:]                                  │
│  You were referred by Keith.                 type-meta         │
│                                                                 │
│  ┌───────────────────────────────┐                             │
│  │  Commission a project →       │  → /services/request        │
│  └───────────────────────────────┘                             │
│                                                                 │
│  Learn the method →                          → /maestro         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**CTA hierarchy:**
- Primary button: `"Commission a project →"` — buyer path, highest revenue priority
- Secondary text link: `"Learn the method →"` — learner path, no button border so it doesn't compete

**Affiliate attribution line:**
- Appears only when `?ref=CODE` resolves to a valid affiliate with a known first name
- Plain `type-meta` text, `text-text-muted` — not a badge, not a callout box
- If code doesn't resolve: line is simply absent. No "Invalid referral" error.

---

## 2. Below Fold

```
─────────────────────────────────────────────────────────────────

  The business card you're holding belongs to a Studio Ordo
  member — an engineer, practitioner, or Affiliate in our guild.

  Studio Ordo builds software using a spec-driven method with
  AI-capable engineers. We also train professionals to direct AI
  in their own work.

  23 years teaching engineers. 10,000+ trained.

─────────────────────────────────────────────────────────────────
```

**No CTAs in the below-fold section.** The CTAs are above the fold. If a visitor scrolls this far, the two decisions are still visible on scroll-up — no need to duplicate them.

---

## Cookie Behaviour

On page mount, if `?ref=CODE` is in the URL:
1. `so_ref` cookie is set: `so_ref=CODE; Max-Age=7776000; Path=/; SameSite=Lax` (90 days)
2. Cookie is set regardless of whether the affiliate name API call succeeds
3. Any subsequent visit to `/services/request` will read `so_ref` from cookie and attribute the referral
