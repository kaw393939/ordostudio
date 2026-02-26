# Sprint 25: `/maestro` Page — Sprint Plan

## 1. Tasks

### T1: Create Route and Page File
- **File:** `src/app/(public)/maestro/page.tsx`
- **Action:** Create the directory and file. Server component (no `"use client"`).
  ```tsx
  import Link from "next/link";
  import { Button } from "@/components/primitives/button";
  import { Card } from "@/components/primitives";
  import { buildMetadata, BOOKING_URL } from "@/lib/metadata";

  export const metadata = buildMetadata({
    title: "Maestro Training",
    description:
      "Eight weeks. Direct AI in software delivery. Build a practice or sharpen a method.",
    canonical: "/maestro",
  });

  export default function MaestroPage() {
    return (
      <main id="main-content" className="container-grid py-6">
        {/* Hero */}
        {/* Who This Is For */}
        {/* Checklist */}
        {/* Format Cards */}
        {/* FAQ */}
        {/* Close */}
      </main>
    );
  }
  ```
- **Why:** Establishes the route. All content sections are built in T2–T6.

---

### T2: Build Hero Section
- **File:** `src/app/(public)/maestro/page.tsx`
- **Action:** Add to `<main>`:
  ```tsx
  <section className="surface p-6">
    <h1 className="type-title text-text-primary">Direct the machine. Build the practice.</h1>
    <p className="mt-2 type-body-sm text-text-secondary">
      Eight weeks. Your expertise, re-oriented for agentic workflows.
    </p>
    <div className="mt-4">
      <Button asChild intent="primary">
        <Link href={BOOKING_URL}>Book your discovery call.</Link>
      </Button>
    </div>
  </section>
  ```
- **Why:** Hero establishes the offer and the single primary CTA before any other content.

---

### T3: Build "Who This Is For" + Checklist
- **File:** `src/app/(public)/maestro/page.tsx`
- **Action:**
  ```tsx
  <section className="mt-6 surface p-6">
    <h2 className="type-title text-text-primary">Who this is for</h2>
    <p className="mt-2 type-body-sm text-text-secondary">
      You have deep expertise. The AI era doesn&apos;t make it obsolete —
      it makes it more valuable, if you know how to apply it.
    </p>
  </section>

  <section className="mt-6 surface p-6">
    <h2 className="type-title text-text-primary">What you get</h2>
    <ul className="mt-3 space-y-2 type-body-sm text-text-secondary">
      {[
        "8-week cohort program — structured, not open-ended",
        "Context Pack operating model applied to your domain",
        "Guild structure and the franchise system",
        "Your expertise translated to agentic workflows",
        "Revenue share from the first engagement",
      ].map((item) => (
        <li key={item} className="flex gap-2">
          <span className="text-text-primary">✔</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  </section>
  ```
- **Why:** Who This Is For is 2 sentences. Checklist is a scannable list — no grid, no numbers.

---

### T4: Build Format Cards
- **File:** `src/app/(public)/maestro/page.tsx`
- **Action:**
  ```tsx
  <section className="mt-6">
    <h2 className="type-title text-text-primary">Choose your format.</h2>
    <div className="mt-4 grid gap-4 md:grid-cols-2">
      <Card className="p-6">
        <p className="type-label text-text-primary">Cohort program</p>
        <p className="mt-1 type-title text-text-primary">$3,000 – $5,000</p>
        <p className="mt-2 type-body-sm text-text-secondary">
          8-week, cohort-based. Limited by Maestro capacity.
        </p>
        <div className="mt-4">
          <Button asChild intent="primary">
            <Link href={`${BOOKING_URL}?source=maestro-cohort`}>Book your discovery call.</Link>
          </Button>
        </div>
      </Card>
      <Card className="p-6">
        <p className="type-label text-text-primary">Advisory retainer</p>
        <p className="mt-1 type-title text-text-primary">$1,500 – $2,500 / month</p>
        <p className="mt-2 type-body-sm text-text-secondary">
          Ongoing 1:1. Applied to your active work, not alongside it.
        </p>
        <div className="mt-4">
          <Button asChild intent="secondary">
            <Link href={`${BOOKING_URL}?source=maestro-advisory`}>Book your discovery call.</Link>
          </Button>
        </div>
      </Card>
    </div>
  </section>
  ```
- **Why:** Two formats, parallel structure, distinct `?source` params for booking attribution.

---

### T5: Build FAQ
- **File:** `src/app/(public)/maestro/page.tsx`
- **Action:**
  ```tsx
  const faqs = [
    {
      q: "Do I need to be an engineer?",
      a: "No. Judgment and domain expertise matter more than syntax. If you can spec a system and evaluate whether it works, you're the target.",
    },
    {
      q: "What's the time commitment?",
      a: "4–6 hours per week. The cohort is structured with defined deliverables, not an open-ended advisory.",
    },
    {
      q: "When does the next cohort start?",
      a: "Book a discovery call and we'll confirm dates. Cohort size is limited by Maestro capacity — we do not run open enrollment.",
    },
    {
      q: "What's the revenue share on guild work?",
      a: "You keep 80% of project revenue on work referred through the Guild. Studio Ordo retains 20% as the operating platform.",
    },
  ] as const;

  // Render:
  <section className="mt-6 surface p-6">
    <h2 className="type-title text-text-primary">Questions we get.</h2>
    <dl className="mt-4 space-y-4">
      {faqs.map(({ q, a }) => (
        <div key={q}>
          <dt className="type-label text-text-primary">{q}</dt>
          <dd className="mt-1 type-body-sm text-text-secondary">{a}</dd>
        </div>
      ))}
    </dl>
  </section>
  ```
- **Why:** `<dl>` is semantically correct for Q&A pairs. Expanded answers — no accordion for 4 items. Headline is "Questions we get." not "Common questions."

---

### T6: Build Close Section
- **File:** `src/app/(public)/maestro/page.tsx`
- **Action:**
  ```tsx
  <section className="mt-6 surface p-6">
    <h2 className="type-title text-text-primary">Built with the method.</h2>
    <p className="mt-2 type-body-sm text-text-secondary">
      The 40/60 Method — the same ratio we teach — runs every Studio Ordo project.
      The training and the work are the same thing.
    </p>
    <div className="mt-4 flex flex-wrap items-center gap-4">
      <Button asChild intent="primary">
        <Link href={BOOKING_URL}>Book your discovery call.</Link>
      </Button>
      <Link href="/insights" className="type-label underline">
        Read the framework →
      </Link>
    </div>
  </section>
  ```
- **Why:** Close repeats the primary CTA (command, not question). Secondary link routes to `/insights` — not a dead end.

---

### T7: Verify + Build
- **Action:**
  1. `npx vitest run` — all tests pass.
  2. `npm run build` — no errors.
  3. Manual: visit `/maestro` — confirm all 6 sections render.
  4. Manual: confirm both format card CTAs have distinct `?source=` params.
  5. Manual: confirm `/maestro` is NOT linked from `/studio` (that's Sprint 27) but IS accessible directly by URL.

---

## 2. Dependency Graph

```
T1 (route scaffold) ──► T2 (hero) ──► T3 (who + checklist) ──► T4 (formats) ──► T5 (faq) ──► T6 (close) ──► T7 (verify)
```

Sequential within the file. T1 must exist before all others. T2–T6 can be done in one editing session.

**Downstream dependencies this sprint unblocks:**
- Sprint 26 (`/card`) — its CTAs link to `/maestro`
- Sprint 28 (homepage hero) — `"Enroll in Maestro →"` tile needs `/maestro` to exist
- Sprint 29 (`/join` replacement) — `"I want to learn this method"` button routes to `/maestro`
