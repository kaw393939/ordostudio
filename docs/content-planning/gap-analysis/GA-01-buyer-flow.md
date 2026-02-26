# GA-01 — Client / Buyer Flow
**User type:** Someone who needs software built or AI delivery capability.  
**Entry points:** Homepage, `/studio`, `/card` (QR), `/services/request`  
**Revenue goal:** Project commission (20% of project value)

---

## Flow Map

```
QR card scan          Homepage          Direct
     │                    │                │
     ▼                    ▼                │
[/card?ref=CODE]  →  [Hero tile: "Commission a project →"]
     │                    │
     └────────────────────┘
                          │
                          ▼
                      [/studio]
                          │
                          ▼
               [/services/request form]
                          │
                          ▼
               [Confirmation + next step]
                          │
                          ▼
              [Admin: /admin/intake → triage]
```

---

## Page 1 — Homepage (`/`)

**File:** `src/app/(public)/page.tsx`

### What exists
- `HomeHero` component (in `src/components/experiments/home-hero.tsx`)
- Section 01 headline: `"The Double Stripping is here."` — jargon, wrong (content plan spec: `"AI is automating execution. What remains is direction."`)
- Section 01 body: uses "CEO of Agents" framing. Two long paragraphs.
- 8 capabilities grid — correct, keep.
- Section 01 CTA: `"See the framework →"` → `/insights` — correct, keep.
- Section 02 heading: `"The 40/60 Split"` — content plan spec: `"The 40/60 Method"`
- Section 02 body: `"A 90-day high-intensity transformation."` — bootcamp language, cut.
- Section 02 CTA: **`"Hire an Associate →"`** — wrong label AND wrong concept (per 06-cta-audit, "Hire an Associate" is retired)
- Section 03: Canon 3-column grid — not in content plan; content plan has no Section 03 Canon block for homepage
- Section 04: "The 90-Day Transformation" — not in content plan for homepage
- Additional sections below (not audited in detail)

### What's needed
| Item | Change |
|------|--------|
| Hero | Rewrite per locked spec: headline, subhead, two tiles (`Commission a project →` / `Enroll in Maestro →`) |
| Section 01 headline | `"The Double Stripping is here."` → `"AI is automating execution. What remains is direction."` |
| Section 01 body | Trim to 4 sentences (content plan spec). Remove "CEO of Agents" label. |
| Section 02 heading | `"The 40/60 Split"` → `"The 40/60 Method"` |
| Section 02 body | Remove `"A 90-day high-intensity transformation."` opener |
| Section 02 CTA | `"Hire an Associate →"` → `"Commission a project →"` pointing to `/services/request` |
| Section 03 Canon | Not in content plan for homepage — remove or demote to `/studio` or `/insights` |
| Section 04 "90-Day" | Not in content plan for homepage — remove |

### What to remove
- `"The Double Stripping is here."` section headline
- `"A 90-day high-intensity transformation."` sentence
- `"Hire an Associate →"` CTA
- Canon 3-card block (Section 03) — apprentice content, wrong page
- "90-Day Transformation" section (Section 04) — not in homepage content plan

---

## Page 2 — Studio (`/studio`)

**File:** `src/app/(public)/studio/page.tsx`  
**Content plan:** `02-studio.md` — client-facing only.

### What exists
- Hero card: `"The Studio Apprenticeship"` headline — this is the wrong hero. Should be client-facing.
- Hero subhead: `"A decentralized guild model for the AI era."` — apprentice pitch, not client pitch.
- Hero CTA: `"Book a Technical Consult"` → `BOOKING_URL` — correct destination, wrong label.
- Second hero CTA: `"Get the Context Pack Starter Kit →"` — apprentice content.
- Section: "The bottega model. Updated for the AI era." — 4-paragraph bottega/Leonardo history — client doesn't need this.
- `StudioBottegaModel` component — guild hierarchy (Apprentice/Journeyman/Maestro/Affiliate) — wrong audience.
- Section: "You're not learning to code. You're learning to direct." — apprentice framing, wrong audience.
- `RecommendedEvents` component — events list at bottom.

### What's needed (from `02-studio.md`)
| Item | Change |
|------|--------|
| Hero headline | `"Commission a project."` |
| Hero subhead | `"AI-capable engineers. Spec-driven method. Audit-logged deliverables."` |
| Hero CTA | `"Start a project →"` → `/services/request` |
| Meta description | `"AI-capable engineers, spec-driven method, audit-logged deliverables."` |
| What We Build section | 5-item list in buyer language (VP Eng persona): AI workflow automation, API integrations, data pipeline tooling, LLM-augmented tooling, internal tools |
| How We Work section | 40/60 Method, Context Pack, AI Audit Log — framed as buyer assurance, not training |
| Who We Work With | Engineering directors, CTOs, VPs Product — 20–500 devs — NOT learners |
| Social proof / proof points | 23 years, 10,000+ students, specialism claim |
| CTA close | `"Start a project →"` |

### What to remove
- Entire bottega history block (Leonardo, Verrocchio paragraph)
- `StudioBottegaModel` component (guild hierarchy)
- "You're not learning to code" section
- `"Get the Context Pack Starter Kit →"` link
- `"Not sure which path fits you? →"` link (this page is for buyers only; no routing confusion needed)
- `RecommendedEvents` — events are for learners/apprentices, not project buyers

---

## Page 3 — Service Request Form (`/services/request`)

**File:** `src/app/(public)/services/request/page.tsx` (398 lines)

### What exists
- Full intake form: contact name, email, org name, goals, timeline, constraints
- Role selector: CTO / Eng Manager / Engineer / Other
- Company size selector
- Package tier selector: STARTER ($2K) / PROFESSIONAL ($5K) / ENTERPRISE ($10K) / CUSTOM — **these are workshop/training prices, not project commission prices**
- AI adoption level selector
- Participant count field — **makes sense for training; makes no sense for project work**
- Measurement event tracking on form start
- POST to `/api/v1/intake` (or similar) — creates an `IntakeRow`
- Success state: shows `next_step` from API response

### What's needed
| Item | Change |
|------|--------|
| Page title | Currently unnamed — needs `"Commission a project"` heading |
| Package tier field | Remove training-tier pricing (STARTER/PROFESSIONAL/ENTERPRISE with participant counts) — replace with `"Project type"` selector: Discovery / Build / Advisory Retainer |
| Participant count | Remove — irrelevant for project work |
| AI adoption level | Keep — useful qualification signal for project type |
| Goals textarea | Keep — correct |
| Timeline | Keep — correct |
| On success | Confirmation message: `"Request received."` + `"We'll be in touch within 1 business day to confirm scope."` |
| `?ref=` cookie check | On page load, check for `so_ref` cookie — if present, associate referral code with this intake submission |

### What to remove
- Package tier pricing UI (STARTER/PROFESSIONAL/ENTERPRISE) — these are training prices, not project commission model
- Participant count field

---

## Page 4 — Confirmation / Next Step

### What exists
- `submitted` state in service request form shows `next_step` field from API response. No dedicated page.

### What's needed
- Inline confirmation (already partially there): clean 2-line state per `04-join.md` pattern: `"Request received."` / `"We'll be in touch within 1 business day."`
- No separate page needed.

---

## Page 5 — QR Landing (`/card`) — **DOES NOT EXIST**

**Content plan:** `05-qr-landing.md`

### What's needed (new page)
| Item | Spec |
|------|------|
| Route | `/card` |
| URL with affiliate | `/card?ref=AFFILIATE_CODE` |
| Hero headline | `"You're holding a Studio Ordo card."` |
| Hero subhead | `"We build software. We train the people who direct AI."` |
| Two CTAs | `"Commission a project →"` → `/services/request` and `"Learn the method →"` → `/maestro` |
| If `?ref=` resolves | Show affiliate's first name: `"You were referred by [Name]."` |
| Below fold | Brief what-we-do (3 sentences max), proof point, no more CTAs |
| Cookie | Set `so_ref` cookie from `ref` param on page load |

### Current state of `/r/[code]` redirect
- **EXISTS** at `src/app/r/[code]/route.ts`
- Currently redirects to `/services` (wrong — should be `/card?ref=CODE`)
- Sets `so_ref` cookie correctly — just wrong redirect destination

---

## Admin: Intake Management (`/admin/intake`)

**File:** `src/app/(admin)/admin/intake/page.tsx` (557 lines)

### What exists
- Full CRUD intake list view
- Status pipeline: NEW → TRIAGED → QUALIFIED → BOOKED → LOST
- Owner assignment
- Priority field
- Deal linkage (`deal_id`, `deal_status`)
- History/audit trail per intake
- Filters + search

### What's needed
| Item | Gap |
|------|-----|
| Commission tracking | No field or view for the 20% project commission amount or calculation |
| Project type field | Intake form collects `goals` as freetext — no structured project type (Discovery / Build / Retainer) that matches new form |
| Referral attribution | No visible `ref_code` or referral attribution on intake detail — needs to surface if `so_ref` cookie was present at submission |

### What to remove
- `package_tier` / `participant_count` fields from intake detail view (once form is updated)
