# GA-02 — Maestro Training Learner Flow
**User type:** Experienced engineer or technical leader who wants to direct AI and build a practice.  
**Entry points:** Homepage hero tile, `/join` → "I want to learn this method", `/card` QR  
**Revenue goal:** Maestro Training cohort ($3,000–$5,000) or Advisory retainer ($1,500–$2,500/mo)

---

## Flow Map

```
Homepage hero          /join              /card QR
"Enroll in Maestro →"  "I want to learn"   intent=learner
         │                   │                  │
         └───────────────────┴──────────────────┘
                             │
                             ▼
                         [/maestro]        ← DOES NOT EXIST
                             │
                       Choose format:
                    ┌────────┴──────────┐
                    ▼                   ▼
              Cohort program       Advisory retainer
                    │                   │
                    └────────┬──────────┘
                             ▼
                       [BOOKING_URL]
                    (external calendar / Calendly)
                             │
                             ▼
                   [No post-booking page yet]
```

---

## Page 1 — Homepage (`/`)

| Item | Current | Needed |
|------|---------|--------|
| Hero tile for learner | Unknown — `HomeHero` component not fully read | `"Enroll in Maestro →"` → `/maestro` |
| Section 02 body | Frames "40/60" as apprentice training | Must also serve as proof of method for prospective Maestro Training students |

*See GA-01 for full homepage audit.*

---

## Page 2 — `/maestro` — **DOES NOT EXIST**

**Content plan:** `03-maestro.md`  
**This is the primary acquisition page for the highest-revenue product.**

### What's needed (full new page)

**Meta**
- `title`: `"Maestro Training — Studio Ordo"`
- `description`: `"8-week cohort. Direct AI in software delivery. Build a practice or sharpen a method."`
- `canonical`: `/maestro`

**Hero**
| Element | Content |
|---------|---------|
| Headline | `"Direct the machine. Build the practice."` |
| Subhead | `"Eight weeks. Your expertise, re-oriented for agentic workflows."` |
| Primary CTA | `"Book your discovery call."` → `BOOKING_URL` |

**Who This Is For (2-sentence max)**
> You have deep expertise. The AI era doesn't make it obsolete — it makes it more valuable, if you know how to apply it.

**The Checklist (5 items, not a grid)**
- [ ] 8-week cohort program — structured, not open-ended
- [ ] Context Pack operating model applied to your domain
- [ ] Guild structure and franchise system
- [ ] Your expertise + agentic workflows = a practice
- [ ] Revenue share from the first engagement

**Choose Your Format section**
| Format | Price | Details |
|--------|-------|---------|
| Cohort program | $3,000–$5,000 | 8-week, cohort-based, limited by Maestro capacity |
| Advisory retainer | $1,500–$2,500/mo | Ongoing 1:1, applied to your active work |

**Questions We Get (FAQ — 4 items)**
1. Do I need to be an engineer? → No. Judgment and domain expertise matter more than syntax.
2. What's the time commitment? → 4–6 hours per week. Structured, not open-ended.
3. When does the next cohort start? → [Dynamic field or "contact us" state]
4. What's the revenue share? → You keep 80% of project revenue on Work referred through the Guild.

**Close**
- Headline: `"Built with the method."` (not a question)
- CTA: `"Book your discovery call."` → `BOOKING_URL`
- Sub-CTA: `"Read the framework →"` → `/insights`

---

## Page 3 — `/join` (learner entry)

**File:** `src/app/(public)/join/page.tsx`  
**Component:** `src/components/join/guild-join-flow.tsx` (276 lines)

### What exists
- 3-question wizard (`step: 1 | 2 | 3 | "results"`)
- Q1: What stage are you at? (craft / projects / expertise / company)
- Q2: What are you looking for? (portfolio / earn-grow / practice / team / observe)
- Q3: When do you want to start? (now / sorting / planning)
- Path resolution logic: maps answers to one of: apprentice / journeyman / maestro / affiliate / observer
- Card results with CTAs to booking URL

### What's needed (from `04-join.md`)
The wizard replaces with 3 buttons + immediate routing. No questions.

| Button | Current | Target |
|--------|---------|--------|
| "I need something built" | Not present | → `/studio` |
| "I want to learn this method" | Not present (Q1 → expertise → maestro card) | → `/maestro` |
| "I want to join the guild" | Not present | → `/apply` |

**State to remove:**
- All 3 question steps
- Path resolution function (`resolvePaths`)
- `Q1_OPTIONS`, `Q2_OPTIONS`, `Q3_OPTIONS` arrays
- Progress dots
- GuildPathCard results system
- "observer" path card

**Result state for "I want to learn this method" button** (inline, no page change):
> `"Discovery call."`  
> `"Book a 30-minute call. We'll map your expertise to the operating model."`  
> CTA: `"Book your discovery call →"` → `BOOKING_URL`

---

## Page 4 — Booking (external)

**Current:** All training CTAs point to `BOOKING_URL` (Calendly or similar, set in `src/lib/metadata.ts`).

### What exists
- `BOOKING_URL` constant in `src/lib/metadata.ts` — referenced across the codebase

### What's needed
- `BOOKING_URL` stays — but `/maestro` must pass context via query param so booker knows which product the person clicked from:  
  `BOOKING_URL?source=maestro-cohort` or `BOOKING_URL?source=maestro-advisory`
- No dedicated post-booking page currently exists. For MVP this is acceptable — booking tool handles it.

---

## Page 5 — Post-Booking / Confirmation

### What exists
- Nothing. User lands on external booking tool.

### What's needed
- MVP: Acceptable to rely on booking tool confirmation.
- Future: `/thank-you?source=maestro` page that:
  - Confirms what was booked
  - Sets expectations: `"You'll hear from us within 24 hours with call prep."`
  - Optionally collects email for newsletter if not already subscribed

---

## Admin: Maestro Training Cohort Management

### What exists
- Nothing specific to Maestro Training enrollment or cohort tracking.
- `/admin/intake` handles inbound requests generically.
- `/admin/approvals` handles role requests.

### What's needed
| Item | Gap |
|------|-----|
| Cohort enrollment view | No admin page exists for tracking who is enrolled in which cohort |
| Revenue tracking | Cohort revenue ($3K–$5K per student) not tracked anywhere — no `cohort_enrollments` table visible |
| Waitlist management | No waitlist flow — needed when cohort capacity is full |
| Cohort capacity gate | FAQ says "limited by Maestro capacity" — no enforcement mechanism exists |

**Priority:** Ship `/maestro` page first (it's a marketing page requiring no backend). Cohort admin is a follow-on.
