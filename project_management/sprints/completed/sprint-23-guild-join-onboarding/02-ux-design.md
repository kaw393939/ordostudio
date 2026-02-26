# Sprint 23: Guild Join Onboarding UX Design

> **Swiss / Bauhaus constraint:** Max 3 type roles per card. Left-aligned body. No decorative elements.
> **Krug constraint:** One primary action per screen. Never obscure the forward path.
> **Cialdini layer:** Each annotated below — influence is embedded in structure and copy, not added on top.
> **Archetype:** Sage primary (calm authority, proof-backed). Per-path archetypes noted on each card.

---

## 1. Page Shell (All States)

```
[PageShell]
Find Your Path in the Studio.
Answer three questions. See what fits.
```

*Subtitle changed from "Five minutes" — that's a claim we can't control. "See what fits" is honest,
Sage-voice, and Krug-clean: it tells you exactly what happens next without overselling.*

---

## 2. Question Flow — Step 1 of 3

> **Krug:** One primary action ("Continue →"), one secondary ("← Back" not yet visible).
> **Cialdini — Commitment/Consistency:** The first question is the micro-commitment; answering it
> creates consistency pressure to complete steps 2 and 3.

```
┌─────────────────────────────────────────────────────────────────┐
│  ●──○──○   Step 1 of 3                                          │
│                                                                 │
│  What describes your situation right now?                       │
│                                                                 │
│  ○  I'm learning my craft — early career or changing tracks    │
│  ○  I have real projects behind me and want to go deeper       │
│  ○  I have deep expertise and want to teach and direct         │
│  ○  I represent a company or team                              │
│                                                                 │
│  [Continue →]  (disabled until one answer selected)            │
└─────────────────────────────────────────────────────────────────┘
```

*Answer copy notes: answers are statements of fact, not self-assessments. Sage voice: direct, no
hedging. "I'm learning my craft" uses Creator archetype language ("craft"), which resonates with the
Hero/Creator segment this answer maps to. Progress dots (●──○──○) satisfy Krug: the user always
knows where they are.*

---

## 3. Question Flow — Step 2 of 3

> **Krug:** Back is always available. Continue is still the only forward action.
> **Cialdini — Commitment/Consistency:** Second answer deepens the ladder. The visitor has now
> spent intentional time and is more invested in reaching the result.

```
┌─────────────────────────────────────────────────────────────────┐
│  ●──●──○   Step 2 of 3                                          │
│                                                                 │
│  What outcome matters most to you?                              │
│                                                                 │
│  ○  Build a portfolio of shipped work and advance my career    │
│  ○  Earn while I grow by contributing to real projects         │
│  ○  Build a practice with my expertise in the AI era           │
│  ○  Train my team with mentored, project-based work            │
│  ○  I want to follow the work before I decide anything         │
│                                                                 │
│  [← Back]  [Continue →]                                        │
└─────────────────────────────────────────────────────────────────┘
```

*Fifth option is the Observer self-selection; it should not be framed as a lesser choice. "Follow
the work" is affirmative, not apologetic. Sage/Liking principle: no shame in the Observer path.*

---

## 4. Question Flow — Step 3 of 3

> **Krug:** Progress is nearly complete — the button label changes to "See My Paths →" to signal
> the payoff is one click away. This is the strongest Commitment moment.
> **Cialdini — Commitment:** Changing the button label to name the reward increases completion rate
> without being manipulative. The visitor earned the result by answering honestly.

```
┌─────────────────────────────────────────────────────────────────┐
│  ●──●──●   Step 3 of 3                                          │
│                                                                 │
│  Where are you in your timeline?                                │
│                                                                 │
│  ○  Ready now — I want to start within the month               │
│  ○  Getting sorted — 1 to 3 months out                         │
│  ○  Planning ahead — 3 to 6 months out                         │
│                                                                 │
│  [← Back]  [See My Paths →]                                    │
└─────────────────────────────────────────────────────────────────┘
```

*Timeline anchors are specific and honest. No "Now" as a panic trigger. No urgency in the labels.
Scarcity, if present, lives on the Maestro card — not in the question flow.*

---

## 5. Results — Path Cards (After Submission)

**Results header:**
```
Here's what we'd suggest.
Based on your answers — not a sales pitch.
```

*Sage voice: "we'd suggest" is honest; "not a sales pitch" names the anxiety before the visitor can
form it. This is Liking (authenticity) and Authority (confidence to name the dynamic) working
together.*

> **Note for implementer:** No filler, no hype. Copy must be as direct as Clark was. The claim is
> already extraordinary; it does not need decoration.

**Swiss layout:** Cards stack single-column. Max 3 type roles per card: `type-title` (path name),
`type-body-sm` (description + bullets), `type-meta` (authority line / cohort note).
Badge is a UI signifier, not a type role.

---

### 5a. Apprentice Path Card

> **Archetype:** Hero + Creator &nbsp;|&nbsp; **Cialdini:** Unity (identity), Commitment (gate projects)

```
┌─────────────────────────────────────────────────────────────────┐
│  [Badge: Apprentice]                                            │
│                                                                 │
│  The Studio Apprenticeship                          type-title  │
│                                                                 │
│  A 12–18 month guided progression through eight gate           │
│  projects. You ship real work, build a portfolio, and          │
│  finish holding artifacts that prove your capability —         │
│  not a certificate.                                  type-body-sm│
│                                                                 │
│  ✔  Mentored directly by the Maestro and Journeyman            │
│  ✔  Every project is production-grade, not a drill             │
│  ✔  Context Pack + Field Notes included from day one           │
│                                                                 │
│  23 years · 10,000+ engineers trained.              type-meta  │
│                                                                 │
│  [Book a Path Consult →]                                        │
│   → BOOKING_URL?path=apprentice                                 │
└─────────────────────────────────────────────────────────────────┘
```

*Authority line ("23 years · 10,000+ engineers") is sourced and verifiable — not a superlative.
It uses the `type-meta` role to stay subordinate to the offer description (Swiss hierarchy).*

---

### 5b. Journeyman Path Card

> **Archetype:** Creator &nbsp;|&nbsp; **Cialdini:** Commitment/Consistency (progression), Social Proof

```
┌─────────────────────────────────────────────────────────────────┐
│  [Badge: Journeyman]                                            │
│                                                                 │
│  The Journeyman Track                               type-title  │
│                                                                 │
│  You've shipped real work. The Journeyman track takes          │
│  you deeper: advanced gate projects, peer mentoring,           │
│  and the path toward directing your own practice.   type-body-sm│
│                                                                 │
│  ✔  Advanced gate projects, Maestro-reviewed                   │
│  ✔  Peer-mentoring responsibilities and stipend                │
│  ✔  Documented progression toward Maestro candidacy            │
│                                                                 │
│  [Book a Path Consult →]                                        │
│   → BOOKING_URL?path=journeyman                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### 5c. Maestro Accelerator Path Card

> **Archetype:** Sage + Creator &nbsp;|&nbsp; **Cialdini:** Authority (expertise re-oriented), Scarcity (genuine cohort)
> **Clark connection:** This is the path Clark named — "artisanal skills… guild-style philosophy of maintaining human excellence." These are domain experts who already have the taste; they need the operating model. Treat them as peers, not students.

```
┌─────────────────────────────────────────────────────────────────┐
│  [Badge: Maestro Accelerator]                                   │
│                                                                 │
│  The Maestro Accelerator                            type-title  │
│                                                                 │
│  You have deep expertise. The AI era doesn't make it           │
│  obsolete — it makes it more valuable, if you know how         │
│  to apply it. The Accelerator gives you the operating          │
│  model: Context Pack, guild structure, franchise system.type-body-sm│
│                                                                 │
│  ✔  8-week cohort program — structured, not open-ended         │
│  ✔  Your expertise, re-oriented for agentic workflows          │
│  ✔  Revenue share from the first engagement                    │
│                                                                 │
│  Cohort-based · Limited by maestro capacity.        type-meta  │
│                                                                 │
│  [Book a Path Consult →]                                        │
│   → BOOKING_URL?path=maestro                                    │
└─────────────────────────────────────────────────────────────────┘
```

*"The AI era doesn't make it obsolete — it makes it more valuable" is the direct counter to the
expert's core fear. Sage archetype: name the fear, answer it with the truth. Clark said taste comes
from experience; the Maestro candidate has the experience. The Accelerator converts it into influence.
No condescension, no "welcome to tech." Peer-to-peer.*

*Scarcity note is operational fact only. No countdown timer. If the next cohort date is known at
implementation time, it may be added: "Next cohort: [Month Year]". If not known, omit — do not
fabricate (see `influence-strategy.md §2.6`).*

---

### 5d. Affiliate Path Card

> **Archetype:** Sage + Explorer &nbsp;|&nbsp; **Cialdini:** Reciprocity (Studio invests first), Unity

```
┌─────────────────────────────────────────────────────────────────┐
│  [Badge: Affiliate]                                             │
│                                                                 │
│  Corporate Affiliate                                type-title  │
│                                                                 │
│  Your team ships real work every day. The Affiliate            │
│  track brings a Maestro into your workflow to run              │
│  mentored project cycles — scoped to your stack,               │
│  on your timeline.                                  type-body-sm│
│                                                                 │
│  ✔  Custom engagement scoped to your stack and team            │
│  ✔  Dedicated Maestro assignment, not a vendor relationship    │
│  ✔  Co-branded materials; your identity stays primary          │
│                                                                 │
│  [Book a Path Consult →]                                        │
│   → BOOKING_URL?path=affiliate                                  │
└─────────────────────────────────────────────────────────────────┘
```

*"Your identity stays primary" is the Reciprocity + Unity signal in a single line: Studio Ordo
invests in the affiliate's success, and the affiliate's own brand is front-and-center. Liking
principle: "I care about your success, not your commission volume."*

---

### 5e. Observer Path Card (always rendered, regardless of answers)

> **Archetype:** Sage (gentle) &nbsp;|&nbsp; **Cialdini:** Reciprocity (free, complete, no obligation), Liking

```
┌─────────────────────────────────────────────────────────────────┐
│  [Badge: Observer]                                              │
│                                                                 │
│  Follow the Work                                    type-title  │
│                                                                 │
│  Not ready to decide. Subscribe to the newsletter              │
│  and follow the studio's public work: field notes,             │
│  case studies, and open sessions. No commitment.    type-body-sm│
│                                                                 │
│  ✔  Free — no credit card, no expiry                           │
│  ✔  Field notes and case studies from active projects          │
│  ✔  Invitation to open sessions (EverydayAI, Town Halls)       │
│                                                                 │
│  Join when you're ready. Or don't.          type-meta          │
│                                                                 │
│  [Follow the Work →]                                            │
│   → /newsletter  (no booking URL — Consistency: they said       │
│     they're not ready to decide)                                │
└─────────────────────────────────────────────────────────────────┘
```

*"Join when you're ready. Or don't." is Reciprocity at its cleanest: the free path is complete in
itself, not a teaser. The CTA is still present (the visitor may surprise itself) but the meta line
removes all pressure. Per `influence-strategy.md §2.1` guardrail: "The free offerings must be
complete in themselves." Never "Join now before the next cohort fills" on the Observer card.*

---

## 6. Footer Change (Before vs After)

> **Cialdini — Unity:** "Join the Studio" is the official CTA verb (`one-page-brand-sheet.md`).
> Using it reinforces Studio Ordo's registered trigger word. "Join the Guild" is acceptable
> in body copy but not in a nav-level tap target.
> **Krug:** One clear label. No question marks. No "click here."

**Before:**
```
[Footer]
Studio Ordo  |  Events  |  Studio  |  Sign In
```

**After:**
```
[Footer]
Studio Ordo  |  Events  |  Studio  |  Join the Studio →  |  Sign In
```
*Change: "Join the Studio →" placed between "Studio" and "Sign In." The arrow indicates forward
movement (progression into the community), not external link. It is a `<Link>` to `/join`.*

---

## 7. Studio Page Hero Change (Before vs After)

> **Krug:** The tertiary link must not compete visually with the two primary CTAs. It sits below them
> as a clearly subordinate option — `type-meta` size, `text-text-muted` color — for visitors who
> are interested but not yet ready to book.
> **Cialdini — Commitment:** This lower-barrier option captures hesitant visitors into the commitment
> ladder (question flow → path card → consult) rather than losing them entirely.

**Before:**
```
[Hero Card]
The Studio Apprenticeship
...
[Book a Technical Consult]  [Get the Context Pack Starter Kit →]
```

**After:**
```
[Hero Card]
The Studio Apprenticeship
...
[Book a Technical Consult]  [Get the Context Pack Starter Kit →]

Not sure which path fits you? →                ← type-meta, text-text-muted, link to /join
```

*The tertiary link is plain text — no button border, no weight — so it does not interrupt the visual
hierarchy of the two primary buttons. Bauhaus principle: every element earns its position. The link
earns its position by capturing a segment that would otherwise leave.*
