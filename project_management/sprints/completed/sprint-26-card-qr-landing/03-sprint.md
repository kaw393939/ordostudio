# Sprint 26: `/card` — Sprint Plan

## 1. Tasks

### T1: Create Route and Page File
- **File:** `src/app/(public)/card/page.tsx`
- **Action:** Create `"use client"` page component. Read `?ref` from `useSearchParams()`. On mount: resolve affiliate name from API, set `so_ref` cookie.
  ```tsx
  "use client";

  import { useEffect, useState, Suspense } from "react";
  import { useSearchParams } from "next/navigation";
  import Link from "next/link";
  import { Button } from "@/components/primitives/button";

  function CardContent() {
    const searchParams = useSearchParams();
    const ref = searchParams.get("ref");
    const [affiliateName, setAffiliateName] = useState<string | null>(null);

    useEffect(() => {
      if (!ref) return;
      // Set so_ref cookie
      document.cookie = `so_ref=${encodeURIComponent(ref.toUpperCase())}; Max-Age=${90 * 86400}; Path=/; SameSite=Lax`;
      // Resolve affiliate first name (best-effort)
      void (async () => {
        try {
          const res = await fetch(`/api/v1/referrals/resolve?code=${ref}`);
          if (res.ok) {
            const data = await res.json();
            if (data.first_name) setAffiliateName(data.first_name);
          }
        } catch {
          // silent — attribution line simply won't render
        }
      })();
    }, [ref]);

    return (
      <main id="main-content" className="container-grid py-6">
        {/* Above fold */}
        {/* Below fold */}
      </main>
    );
  }

  export default function CardPage() {
    return (
      <Suspense>
        <CardContent />
      </Suspense>
    );
  }
  ```
- **Note:** Check whether `/api/v1/referrals/resolve?code=CODE` endpoint exists. If it does not, create a minimal API route that looks up the affiliate's `display_name` or `first_name` by referral code. If the endpoint doesn't exist and can't be built this sprint, ship the page without the name-resolution feature — the cookie still works.

---

### T2: Build Above-Fold Content
- **File:** `src/app/(public)/card/page.tsx`
- **Action:** Add above-fold section to `CardContent`:
  ```tsx
  <section className="surface p-6">
    <h1 className="type-title text-text-primary">You&apos;re holding a Studio Ordo card.</h1>
    <p className="mt-2 type-body-sm text-text-secondary">
      We build software. We train the people who direct AI.
    </p>
    {affiliateName && (
      <p className="mt-2 type-meta text-text-muted">
        You were referred by {affiliateName}.
      </p>
    )}
    <div className="mt-4 flex flex-col gap-3 sm:flex-row">
      <Button asChild intent="primary">
        <Link href="/services/request">Commission a project →</Link>
      </Button>
      <Link href="/maestro" className="type-label underline self-center">
        Learn the method →
      </Link>
    </div>
  </section>
  ```
- **Why:** Primary button is the buyer CTA. Secondary is a text link so it doesn't compete visually. Attribution line only renders when name resolves.

---

### T3: Build Below-Fold Content
- **File:** `src/app/(public)/card/page.tsx`
- **Action:**
  ```tsx
  <section className="mt-6 surface p-6">
    <p className="type-body-sm text-text-secondary">
      The business card you&apos;re holding belongs to a Studio Ordo member — an engineer,
      practitioner, or Affiliate in our guild.
    </p>
    <p className="mt-3 type-body-sm text-text-secondary">
      Studio Ordo builds software using a spec-driven method with AI-capable engineers.
      We also train professionals to direct AI in their own work.
    </p>
    <p className="mt-3 type-meta text-text-muted">
      23 years teaching engineers. 10,000+ trained.
    </p>
  </section>
  ```
- **Why:** 3 sentences. No CTAs. Gives context for visitors who want more before deciding.

---

### T4: Update `/r/[code]` Redirect
- **File:** `src/app/r/[code]/route.ts`
- **Action:** Change redirect destination from `/services` to `/card?ref=CODE`:
  ```ts
  // Before
  const redirectTarget = "/services";

  // After
  const redirectTarget = `/card?ref=${code.toUpperCase()}`;
  ```
  The cookie in `/r/[code]/route.ts` can be retained as belt-and-suspenders but the `/card` page also sets it, so duplication is harmless.
- **Why:** QR card scans should land on the purpose-built first-impression page, not the services catalogue.

---

### T5: Check or Create Affiliate Name API Endpoint
- **Action:** Search for `GET /api/v1/referrals/resolve` or similar. If it exists, verify it returns `{ first_name: string }` for a valid code. If it doesn't exist, create a minimal route:
  ```
  src/app/api/v1/referrals/resolve/route.ts
  ```
  That reads the `code` query param, looks up the referral code in the DB, and returns `{ first_name }` or 404.
- **Preferred outcome:** Complete this endpoint in Sprint 26 so the attribution line works on launch day.
- **If deferred:** The page ships without the name-resolution feature (cookie still works). Mark as **carry to Sprint 31 T5** — the Sprint 31 plan has a dedicated task slot for this.
- **Why:** Attribution line is a quality-of-life feature, not a critical path. The page and cookie work without it.

---

### T6: Verify + Build
- **Action:**
  1. `npx vitest run` — all tests pass.
  2. `npm run build` — no errors.
  3. Manual: visit `/card` (no ref) — confirm page renders, no attribution line, no error.
  4. Manual: visit `/card?ref=TESTCODE` — confirm cookie is set (`document.cookie` check in devtools), confirm attribution line shows if code resolves.
  5. Manual: visit `/r/TESTCODE` — confirm redirect lands on `/card?ref=TESTCODE`.

---

## 2. Dependency Graph

```
T1 (page scaffold + cookie logic)
         │
         ▼
T2 (above-fold) ──► T3 (below-fold)
         │
         ▼
T4 (/r/[code] redirect update — independent of T2/T3, just needs /card to exist)
T5 (affiliate API endpoint — non-blocking)
         │
         └────────────────────► T6 (verify)
```

**Upstream dependency:** Sprint 25 (`/maestro`) must be live before T2 is done — `"Learn the method →"` links there.
