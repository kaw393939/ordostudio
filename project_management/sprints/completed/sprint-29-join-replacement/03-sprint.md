# Sprint 29: `/join` Replacement — Sprint Plan

## 1. Tasks

### T1: Audit GuildJoinFlow and Current `/join` Route
- **Action:**
  1. Read `src/app/(public)/join/page.tsx` (or wherever `/join` lives).
  2. Find the `GuildJoinFlow` component file.
  3. Note: Is `GuildJoinFlow` used anywhere else in the codebase? (grep for `GuildJoinFlow`)
  4. Map out: Q1 "company" option location, Corporate Affiliate result card, observer result card, `BOOKING_URL?path=affiliate` usage.
- **Why:** Before deleting, know the blast radius. If `GuildJoinFlow` is used only in `/join`, the whole component can be removed from the page with no side effects.

---

### T2: Replace Page with Three-Button Layout
- **File:** `src/app/(public)/join/page.tsx`
- **Action:** Replace the entire page content with a server component:
  ```tsx
  import Link from "next/link";

  export const metadata = {
    title: "Join — Studio Ordo",
    description: "Tell us what brings you here. We build software, teach the Maestro method, and welcome new guild members.",
  };

  export default function JoinPage() {
    const options = [
      {
        label: "I need something built.",
        description: "Building an AI-assisted tool or internal product.",
        href: "/studio",
      },
      {
        label: "I want to learn this method.",
        description: "The Maestro course on directing AI in software work.",
        href: "/maestro",
      },
      {
        label: "I want to join the guild.",
        description: "Apprentice, Journeyman, or Affiliate.",
        href: "/apply",
      },
    ];

    return (
      <main id="main-content" className="container-grid py-6">
        <h1 className="type-title text-text-primary">What brings you here?</h1>
        <div className="mt-6 flex flex-col gap-3">
          {options.map((opt) => (
            <Link
              key={opt.href}
              href={opt.href}
              className="surface border-border border rounded p-5 block hover:bg-bg-subtle transition-colors"
            >
              <span className="type-label text-text-primary block">{opt.label}</span>
              <span className="type-body-sm text-text-secondary block mt-1">
                {opt.description}
              </span>
            </Link>
          ))}
        </div>
      </main>
    );
  }
  ```

---

### T3: Remove GuildJoinFlow from Page
- **Action (if GuildJoinFlow is only referenced in `/join`):**
  - Remove `import { GuildJoinFlow } from ...` from page file
  - Remove `<GuildJoinFlow />` render call
  - The component file itself can remain in the codebase — don't delete files this sprint, just remove from page usage
- **Action (if GuildJoinFlow is imported elsewhere):**
  - Remove only the import and usage in `/join/page.tsx`
  - Do NOT modify the component file — other pages still depend on it

---

### T4: Clean Up GuildJoinFlow Internals (Non-Blocking)
- **File:** `GuildJoinFlow.tsx` (wherever it lives)
- **Action (do this only if the wizard is being kept/used elsewhere — otherwise skip):**
  - Remove Q1 `"company"` option from the first question's options array
  - Remove Corporate Affiliate result card
  - Remove observer result card
  - Remove any `BOOKING_URL?path=affiliate` usage
- **Why:** These reference the removed "Corporate Affiliate" concept. If the wizard is kept for another purpose (e.g., admin onboarding), clean it internally. If the wizard is being fully abandoned (only used on `/join`), this task can be skipped — the component sits dormant.

---

### T5: Verify + Build
- **Action:**
  1. `npx vitest run` — no new failures.
  2. `npm run build` — no errors.
  3. Manual: `/join` loads, shows three buttons, no wizard UI.
  4. Manual: `"I need something built."` → `/studio`.
  5. Manual: `"I want to learn this method."` → `/maestro`.
  6. Manual: `"I want to join the guild."` → `/apply` (may return 404 until Sprint 30 — that is acceptable).
  7. Manual: No progress dots, no multi-step form, no Q1/Q2/Q3 inputs anywhere.

---

## 2. Dependency Graph

```
T1 (audit GuildJoinFlow usage)
          │
          ▼
T2 (replace page with 3-button layout)
T3 (remove GuildJoinFlow from page)
T4 (clean internals — non-blocking)
          │
          ▼
     T5 (verify + build)
```

**Soft dependency:** `/apply` route may 404 until Sprint 30. This is expected and acceptable — Sprint 30 immediately follows.
