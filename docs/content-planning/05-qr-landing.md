# `/card` Page — QR Landing Page Spec (NEW)

**Status:** Draft · **Last updated:** 2026-02-24
**Route:** `src/app/(public)/card/page.tsx` (does not exist yet)
**Alt route to consider:** `/qr` or `/hi` — decision needed before build

---

## What This Page Does

This is the **landing page for the physical Studio Ordo business card**.

Someone received a card from a Studio Ordo Affiliate, Journeyman, or Maestro at a meetup, conference, or direct encounter. They scanned the QR code. They've never heard of Studio Ordo and have no context. 

This page has approximately **15 seconds** to answer three questions:
1. What is this?
2. Why should I care?
3. What do I do next?

It is not a marketing page. It is a first impression.

---

## Design Constraints

- **One viewport on mobile.** Most QR scans happen on a phone. The essential content must fit above the fold on a 390px screen.
- **No nav required.** The user didn't come from the site. Don't send them wandering. Two CTAs maximum, both visible without scrolling.
- **Fast.** This page should have the lightest possible JS load. Static or RSC-only.
- **No jargon above the fold.** No "Context Packs," "AI Audit Logs," "Bottega Model" until after the hook.

---

## Page Structure

### Hero (entire viewport on mobile)

```
SMALL LABEL:  Studio Ordo

HEADLINE:     The person who gave you this card
              builds with AI for a living.

SUBHEAD:      Studio Ordo is the guild they work through —
              AI-directed work, spec-driven, audit-logged.

TWO CTAs (equal weight, stacked on mobile):

  [I need something built]   → /join?intent=buyer
  [I want to learn this]     → /join?intent=learner

> **Krug on this hero:** The headline works because it's specific and personal. "The person who gave you this card" — that's the person holding the card. Immediate connection. No setup needed.
>
> **CTA label cut:** Original second CTA was "I want to learn to work like this" — too long. "I want to learn this" is under 5 words. Passes the billboard test.

SMALL TEXT:   The person who referred you: [NAME] (if referral code in URL param)
              Or just: "A member of the Studio Ordo guild"
```

**URL parameter handling:** The QR code should encode a referral identifier so Keith can track which Affiliate is driving traffic. Format: `/card?ref=AFFILIATE_CODE`. The page should display the Affiliate's first name if the code resolves.

---

### Below the fold (secondary content — optional read)

**Section: What is Studio Ordo?**

> **Krug:** The original section opened with three sentences saying the same thing in different words. Lead with the most specific, personal sentence. Cut the rest.

```
HEADLINE: A guild for the AI era.

BODY:
The business card you're holding belongs to a Studio Ordo member.
They spec projects, direct AI agents, and ship work that can be evaluated.
If you need something built — or want to work this way yourself — you're in the right place.
```

> Three sentences. Each one earns its place. Cut any that don't.

**Section: Two ways in**

```
┌────────────────────────────┐  ┌────────────────────────────┐
│  NEED WORK DONE?           │  │  WANT TO BUILD THIS WAY?   │
│                            │  │                            │
│  Commission a project      │  │  Join as an Apprentice     │
│  through the guild.        │  │  (no cost to join)         │
│  Spec-driven. Audit-logged.│  │  Build a real portfolio.   │
│  You see who's building.   │  │  Earn referral commissions.|
│                            │  │                            │
│  [Commission a project →]  │  │  [Apply to join →]         │
│  → /services/request       │  │  → /apply                  │
└────────────────────────────┘  └────────────────────────────┘
```

---

## Referral Attribution

The QR code on each business card should encode a unique Affiliate code. This lets the studio:
- Track which Affiliates are driving traffic
- Attribute any resulting commissions
- Show Affiliates their referral data

**URL format:** `studioORDO.com/card?ref=kwilliams` or `/card?ref=A001`

**Implementation note:** The `ref` param is stored in a cookie or hidden field and passed through to the `/services/request` form so the Affiliate gets credit for any resulting project.

---

## What NOT to Put on This Page

- No pricing (this is top-of-funnel, not a sales close)
- No program curriculum detail
- No long bio (single sentence about Keith only if needed)
- No navigation header (or minimal — Studio Ordo wordmark only, no links)
- No "Subscribe to the newsletter" (wrong conversion goal for this audience)
- No jargon ("Context Pack," "AI Audit Log," "Bottega") above the second scroll

---

## Meta Tags

```
title: "Studio Ordo — AI-Capable Guild Work"
description: "You were referred by a Studio Ordo member. We build AI-directed projects and train people to work this way."
canonical: "/card"
```

**Note:** This page should NOT be indexed by search engines — it's only for QR code traffic. Add `noindex` or handle via `robots.ts`.

---

## Physical Card Spec (for reference — not a code file)

| Element | Content |
|---------|---------|
| Front | Name · Title · Studio Ordo |
| URL on card | `studioORDO.com/card?ref=[code]` |
| QR code destination | Same URL |
| Tagline (optional) | "AI-directed. Guild-backed." or "We build with method." |

The physical card itself is the affiliate's "skin in the game" — the identity commitment that signals they're part of the network even before they've earned a commission.

---

## URL Decision

Three options — pick one before building:

| Option | URL | Notes |
|--------|-----|-------|
| A | `/card` | Descriptive, matches the physical object |
| B | `/hi` | Human, casual, works for any referral context |
| C | `/qr` | Technical, accurate, less charming |

**Recommendation: `/card`** — descriptive and specific to the use case. Easy to remember if someone types it manually.
