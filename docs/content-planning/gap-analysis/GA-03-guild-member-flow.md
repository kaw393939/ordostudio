# GA-03 — Guild Member Flow (Apprentice / Journeyman)
**User type:** Early-career engineer or career-changer learning to direct AI through shipped work.  
**Entry points:** `/join` → "I want to join the guild", `/card` QR → `?intent=learner`, `/apply/apprentice` direct  
**Revenue goal:** This path is investment-first (training = cost). Revenue is downstream through commissions on work these members eventually deliver.

---

## Flow Map

```
/join                /card?intent=learner
"I want to join"           │
        │                  │
        └──────────────────┘
                   │
                   ▼
             [/apply]  ← Landing: which guild role?
             (does not exist as standalone route)
                   │
        ┌──────────┼──────────┐
        ▼          ▼          ▼
  Apprentice  Journeyman   Observer
     │
     ▼
[/register?role=apprentice]
     │
     ▼
[/login?returnTo=/apply/apprentice]
     │
     ▼
[/apply/apprentice]  ← Form: portfolio URL + experience
     │
     ▼
[/dashboard?applied=apprentice]
     │
     ▼
[Admin: /admin/approvals → role request review → APPROVE/REJECT]
     │
     ▼
[User notified (no notification system exists yet)]
     │
     ▼
[/dashboard — apprentice view]
     │
     ▼
[/dashboard/apprentice-profile — gate progress]
```

---

## Page 1 — `/join`

*See GA-02 for full join page audit.*

**Specific to guild member flow:**
- Current wizard: Q1 `"craft"` → Apprentice card  
- Target: Button `"I want to join the guild"` → `/apply` (or modal/inline card)

---

## Page 2 — `/apply` (role selection landing)

### What exists
- Routes: `/apply/affiliate` and `/apply/apprentice` exist.
- **No `/apply` index page exists** — visiting `/apply` would 404.

### What's needed
A simple routing page (or auto-redirect logic) that says:

> "Which path?"
> - [Apprentice] — I'm learning
> - [Journeyman] — I've shipped, I want to go deeper *(no form exists for Journeyman yet)*
> - [Observer] — I want to follow the work

Currently `/join` handles this via the wizard results. Once the wizard is replaced with 3 buttons, `"I want to join the guild"` needs a destination. Options:
1. Build `/apply` index as a simple role-selection screen.
2. Route directly to `/apply/apprentice` from the join button (assuming most guild joiners are apprentice-level).

**Recommended:** Option 1 — build `/apply` index. It's the clean URL from `04-join.md`.

---

## Page 3 — `/register`

**File:** `src/app/(public)/register/page.tsx`

### What exists
- Full registration form: email, password, confirm password, terms checkbox
- Reads `?role` parameter to set post-registration redirect:
  - `role=affiliate` → `/login?returnTo=/apply/affiliate`
  - `role=apprentice` → `/login?returnTo=/apply/apprentice`
  - Default → `/login`
- Validates via `registerSchema` (zod)
- POSTs to HAL API `auth_register` link

### What's needed
| Item | Gap |
|------|-----|
| `?role=journeyman` handling | Not present — if Journeyman apply path is built, the register redirect needs a case |
| Page title/heading | Generic `"Register"` / `"Create a new account."` — functional but bland |
| Terms link | `termsAccepted` checkbox exists — verify it links to `/terms` (present) and `/privacy` (present) |
| No `?intent` param handling | `/card?intent=learner` routes should carry intent through registration |

### What to remove
- Nothing — register form is correct and complete for the flow.

---

## Page 4 — `/login`

**File:** `src/app/(public)/login/page.tsx`

### What exists
- Login form: email + password
- Reads `?returnTo` — redirects to intended destination after auth
- HAL-linked to `auth_login`

### What's needed
- Nothing substantial. The `returnTo` param chain works correctly.
- Consider: password reset / forgot password link — not present anywhere in the codebase.

---

## Page 5 — `/apply/apprentice`

**File:** `src/app/(public)/apply/apprentice/page.tsx`

### What exists
- Form: `portfolio` (URL) + `experience` (text input — single line `<Input>`, not `<Textarea>`)
- POSTs to `/api/v1/roles/request` with `requested_role_name: "APPRENTICE"`
- On success: redirects to `/dashboard?applied=apprentice`

### What's needed
| Item | Gap |
|------|-----|
| `experience` field | Is a single-line `<Input>` — should be `<Textarea>` for multi-line response |
| Page heading | `"Apply for Apprentice Program"` — acceptable but dry. Consider: `"Apply to the Studio."` |
| Context for reviewer | Only collects `portfolio` + `experience`. Admin reviewer sees this as `context` JSON. Consider adding: current role, years of experience, what they want to build |
| No `?ref` attribution | If user arrived via `/card?ref=CODE` → registered → applied, the referral code is not passed through. Needs to be read from `so_ref` cookie and included in context |

---

## Page 6 — `/dashboard` (post-apply state)

**File:** `src/app/(public)/dashboard/page.tsx`

### What exists
- Shows `?applied=apprentice` banner state (implied by URL param — need to verify the component handles it)
- Detects roles from `/api/v1/me` response: `APPRENTICE`, `AFFILIATE`, `MAESTRO`, `ADMIN`
- Subtitle changes based on role:
  - Affiliate: "Share your referral link, track attribution, and get paid."
  - Operator: "Your operator cockpit."
  - Default: "Manage your profile and registrations."
- `ActionFeed` component renders

### What's needed
| Item | Gap |
|------|-----|
| Applied but pending state | When role request is `PENDING`, user has no visual indication their application was received and is under review |
| Applied + rejected state | No UI state for a rejected role request |
| `?applied=apprentice` banner | Verify the dashboard page actually reads and displays this param — code review shows it's passed in redirect but the page component may not even read `searchParams` |
| Guild tier display | Approved apprentice should see their current tier and next gate in dashboard |

---

## Page 7 — `/dashboard/apprentice-profile`

**File:** `src/app/(public)/dashboard/apprentice-profile/` (directory exists)

### What exists
- Directory exists — need to read the page component to audit contents.

### What's needed
- Gate progress tracker (Gate 1–8)
- Current gate project title + description
- Artifacts submitted
- Maestro review status per gate
- Path to next gate

*(This page needs a separate deeper audit pass — it's not a public acquisition page but it is a key retention surface.)*

---

## Admin: Role Request / Approvals (`/admin/approvals`)

**File:** `src/app/(admin)/admin/approvals/page.tsx`

### What exists
- Tabs: "Actions" (action proposals) | "Roles" (role requests)
- Loads pending role requests from `/api/v1/admin/role-requests`
- Shows: user email, requested role, status, created_at, context JSON

### What's needed
| Item | Gap |
|------|-----|
| Approve / Reject actions | The list shows requests — need to verify the detail page (`/admin/approvals/[id]`) has approve/reject buttons |
| Notification on decision | No email or in-app notification is sent when a role request is approved or rejected — user has no way to know |
| Context display | `context` is stored as raw JSON — admin should see portfolio URL + experience as labeled fields, not raw JSON blob |
| Referral attribution | If application included `so_ref`, it should appear in the review UI |

---

## What to Remove

| Item | Reason |
|------|--------|
| GuildJoinFlow 3-question wizard | Replace with 3 buttons per `04-join.md` |
| `resolvePaths()` function | No longer needed once wizard is removed |
| `Q1_OPTIONS`, `Q2_OPTIONS`, `Q3_OPTIONS` | No longer needed |
| `PROGRESS_DOTS` array | No longer needed |
| Q1 option `"company"` ("I represent a company or team") | Corporate Affiliate path — removed. Companies go through `/services/request` as buyers. |
| `GuildPathCard` result card for `"affiliate"` path (Q1=company) | Corporate Affiliate card — removed. |
| `GuildPathCard` "observer" card | Observer is not a guild path — make it a tertiary text link at most |
| All wizard `step: 1 \| 2 \| 3` state | Unnecessary complexity |
