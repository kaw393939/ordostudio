# CTA Audit + Site-Wide Routing Map

**Status:** Draft · **Last updated:** 2026-02-24

This document audits every call-to-action currently on the site, flags problems, and defines the target state. This is the **source of truth for all link destinations** across pages, components, and layouts.

---

## Krug Pre-Audit Checklist

Apply these tests to every CTA before it ships. They are pass/fail.

**The "What Happens Next" test**
Read the button label. Without clicking, you must know exactly what happens when you do. If you have to guess, it fails.
- PASS: `Commission a project` — I'm starting a project request
- PASS: `Book a discovery call` — I'm booking a call
- FAIL: `Hire an Associate` — Hiring what? For what? Is this a job posting, an agency, a form?
- FAIL: `Learn more` — Learn more about what? Never use this label anywhere.

**The "Question Mark" test**
Count the implicit question marks on the page. Each ambiguous label, unexplained term above the fold, or CTA with two possible meanings = one question mark. Target: zero per page.

**The "Shortest Passing Label" test**
Can the label lose a word and still be clear? If yes, cut it.
- `Commission a project` — minimal, keep
- `Book a discovery call` — "discovery" adds meaning (not just any call), keep
- `Enroll in Maestro Training` — once page establishes context, can shorten to `Enroll`

---

## Part 1 — Current CTA Inventory (Broken State)

### Homepage (`/`)

| CTA Label | Current Destination | Problem |
|-----------|--------------------|---------| 
| `Hire an Associate →` | `/services/request` | Label not in approved system; misleads about what's being requested |
| `Hire an Associate →` | `/studio` | **SAME LABEL, DIFFERENT URL** — directly contradictory |
| `Hire an Associate →` | `/services/request` (×2) | Repeated label, multiple sections |
| `See the framework →` | `/insights` | OK |
| `Join the studio →` | `/join` | OK (approved CTA) |
| `Full bio →` | `/about` | OK |
| `Subscribe →` | `/newsletter` | OK |

**Critical bug:** "Hire an Associate" appears 3× with two different destinations. This is not just inconsistent — it signals that the site itself doesn't know what it's trying to do. Buyers lose trust.

---

### `/studio` Page

| CTA Label | Current Destination | Problem |
|-----------|--------------------|---------| 
| `Book a Technical Consult` | `BOOKING_URL` (`cal.com/...`) | Label OK; destination leaks brand context at highest intent moment |
| `Get the Context Pack Starter Kit →` | `/resources/context-pack` | OK — good secondary offer |
| `Not sure which path fits you? →` | `/join` | OK |

---

### Navigation (check required)

Nav links need to be audited separately. Key concern: does any nav item currently link to the old "Hire an Associate" flow or show a broken routing label?

**Action needed:** Read `src/app/(public)/layout.tsx` and the nav component to audit navigation-level CTAs.

---

## Part 2 — Approved CTA System (Target State)

This is the complete, approved set of CTA labels and their destinations. Every button, link, and in-line CTA on the site must use one of these. No exceptions.

### Primary CTAs (high intent — drives revenue)

| Label | Destination | Use On |
|-------|-------------|--------|
| `Commission a project` | `/services/request` | Homepage, /studio, /join result, /card |
| `Book a discovery call` | `BOOKING_URL` | /maestro, /studio, /join result, any advisory context |
| `Enroll in Maestro Training` | `/maestro` | Homepage, /join result |
| `Apply for next cohort` | `/services/request` | /maestro pricing section |

### Secondary CTAs (routing + value)

| Label | Destination | Use On |
|-------|-------------|--------|
| `Join the guild` | `/join` | Homepage, /studio, /card, nav |
| `See program details` | `/maestro` | Homepage section 04 |
| `View training tracks` | `/maestro` | Homepage hero (alternative) |
| `Get the Context Pack` | `/resources/context-pack` | /studio, /maestro, supporting sections |

### Tertiary CTAs (low-friction, always-available)

| Label | Destination | Use On |
|-------|-------------|--------|
| `Subscribe to the Brief` | `/newsletter` | Homepage close, /maestro, any footer |
| `Read the full story` | `/about` | Where Keith bio appears |
| `See the framework` | `/insights` | Section 01 of homepage |

---

## Part 3 — Routing Map (All Audiences)

```
ENTRY POINTS
────────────────────────────────────
/ (homepage)
    ├── "Commission a project" → /services/request
    ├── "Enroll in Maestro Training" → /maestro
    ├── "Join the guild" → /join
    └── "Subscribe" → /newsletter

/studio (client-facing)
    ├── "Commission a Project" → /services/request
    ├── "Book a discovery call" → BOOKING_URL
    └── "Not sure?" → /join

/maestro (training)
    ├── "Book a discovery call" → BOOKING_URL
    ├── "Apply for next cohort" → /services/request
    └── "Commission a project" (escape) → /studio

/join (intake router)
    ├── Path A (Buyer) → /studio → /services/request
    ├── Path B (Learner, ready) → BOOKING_URL
    ├── Path B (Learner, researching) → /maestro + /newsletter
    ├── Path C (Builder) → /apply or /apprentices
    └── Path C (QR referral) → /card

/card (QR landing)
    ├── "I need something built" → /join?intent=buyer
    └── "I want to learn" → /join?intent=learner
```

---

## Part 4 — Label Consistency Audit (Guild Hierarchy)

The site currently uses **inconsistent labels** for guild members across different pages. This must be resolved before building anything new.

### Current Labels Found on Site

| Page | Labels Used |
|------|------------|
| Homepage sections | Novice / Apprentice / Associate / Maestro |
| /studio page | Apprentice / Journeyman / Maestro |
| /join metadata | Apprentice / Journeyman / Maestro Accelerator / Affiliate / Observer |
| Business docs | Apprentice / Journeyman / Maestro / Affiliate |

### Canonical Labels (locked from business model conversation)

| Level | Label | Who They Are | Cost |
|-------|-------|-------------|------|
| 0 | **Affiliate** | Referred in, scanned a QR code, interested but uncommitted | Free |
| 1 | **Apprentice** | Committed member, builds a portfolio, earns commissions on referrals | Free |
| 2 | **Journeyman** | Employed/experienced engineer doing guild client work | Earns per project |
| 3 | **Maestro** | Senior director of AI agents, teaches cohorts, runs advisory | Earns commission + training revenue |

**Retire immediately from all public-facing pages:**
- "Novice" (homepage section 05 — replace with Apprentice)
- "Associate" (homepage section 05 — replace with Journeyman)
- "Maestro Accelerator" (/join metadata — replace with "Maestro Training")
- "Observer" (/join metadata — either retire or define clearly)

---

## Part 5 — BOOKING_URL Audit

The `BOOKING_URL` constant (defined in `src/lib/metadata.ts`) points to `cal.com/alex-macaw/30min`.

**Issues:**
- "alex-macaw" is not the Studio Ordo brand name — the URL itself is off-brand
- The cal.com page breaks the brand experience at the moment of highest intent
- No referral tracking or attribution when coming from the site

**Options:**
| Option | Action | Notes |
|--------|--------|-------|
| A | Keep cal.com, update slug to `cal.com/studioORDO/discovery` | Low effort, small improvement |
| B | Build an internal `/services/request` form that captures intent + books | Full control, more work |
| C | Embed cal.com widget in `/services/request` page | Keeps brand context, uses cal.com infra |

**Recommendation: Option C** for now — embed the cal.com widget inline on `/services/request` so the user never leaves the site. The URL slug upgrade (Option A) can be done in parallel for free.

---

## Part 6 — Action Checklist

### Immediate (before any new pages ship)

- [ ] Replace all 3 instances of `"Hire an Associate"` on homepage with correct labels (see routing map above)
- [ ] Fix homepage section 05 level labels: Novice→Apprentice, Associate→Journeyman
- [ ] Confirm `BOOKING_URL` constant value and update if needed
- [ ] Audit nav component for any broken CTA labels

### With homepage rewrite

- [ ] Implement Option C hero (two routing tiles)
- [ ] Add section number to homepage Section 03 (The Canon)
- [ ] Fix CTA in Section 02 from "Hire an Associate →" to "Commission a project →"
- [ ] Fix CTA in Section 05 from "Hire an Associate →" to "Commission a project →"

### With new page builds

- [ ] `/maestro` page — all CTAs per 03-maestro.md
- [ ] `/card` page — all CTAs per 05-qr-landing.md
- [ ] Verify `/join` GuildJoinFlow routing aligns with 04-join.md

### Before printing business cards

- [ ] `/card` route exists and loads cleanly on mobile
- [ ] QR code generated from `studioORDO.com/card?ref=[code]`
- [ ] Referral attribution tested end-to-end
