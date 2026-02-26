# Sprint 19 — Homepage & Metadata Polish: UX/UI Design

**Status:** Approved ✅  
**Date:** 2026-02-24  
**Depends on:** 01-spec.md approved

---

## Design Principles (from existing system)

All changes follow the established Swiss/Bauhaus design system documented in `docs/design-system.md` and `business/studio-ordo/style-guide.md`:
- Type scale tokens: `type-display`, `type-h2`, `type-title`, `type-body-sm`, `type-label`, `type-meta`
- Surface patterns: `surface`, `surface-elevated`, `surface-muted`
- Color tokens: `text-text-primary`, `text-text-secondary`, `text-text-muted`, `bg-action-primary`
- Motion: `motion-base` on all interactive elements
- No ornamental gradients, no decorative illustrations

---

## 1. Root Metadata — What Appears in Browser Tabs and Social Shares

### Current (broken)
```
<title>LMS 219</title>
<meta name="description" content="LMS 219 UI consuming /api/v1 HAL APIs"/>
<meta property="og:title" content="LMS 219"/>
<meta name="twitter:title" content="LMS 219"/>
```

### Target
```
<title>Studio Ordo — AI Training That Ships</title>
<meta name="description" content="Spec-driven AI training for teams and individuals. Eight capabilities, structured method, artifacts that prove how you work. 23 years, 10,000+ engineers."/>
<meta property="og:title" content="Studio Ordo — AI Training That Ships"/>
<meta property="og:description" content="Spec-driven AI training for teams and individuals. Eight capabilities, structured method, artifacts that prove how you work."/>
<meta property="og:image" content="/og-default.png"/>
<meta property="og:site_name" content="Studio Ordo"/>
<meta property="og:type" content="website"/>
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:title" content="Studio Ordo — AI Training That Ships"/>
<meta name="twitter:description" content="Spec-driven AI training for teams and individuals. 23 years, 10,000+ engineers."/>
```

### Per-page title template
Pattern: `"%s | Studio Ordo"` — so the About page renders as "About • Studio Ordo | Studio Ordo". 

**Decision:** The About page already sets its own `title: "About • Studio Ordo"`. With the template, this becomes `"About • Studio Ordo | Studio Ordo"` which is redundant. **Recommendation:** Change template to `"%s | Studio Ordo"` and have each page set just its purpose: `"About"` → renders as `"About | Studio Ordo"`. Pages that want full control (homepage) set `title.absolute`.

---

## 2. OG Image

### Specification
- **Size:** 1200×630px (standard OG dimensions)
- **Format:** PNG
- **Content:** Studio Ordo wordmark, left-aligned on a light `bg-canvas` (#f6f6f4) background, with the tagline "AI Training That Ships" in `type-body-sm` weight below. Clean, Swiss — matches the site's visual identity.
- **No logo graphic** — just typographic, matching the text-only branding used in the header.
- **File location:** `public/og-default.png`

### Social share preview (expected)
```
┌─────────────────────────────────────┐
│                                     │
│   Studio Ordo                       │
│   AI Training That Ships            │
│                                     │
│   ─────────────────────────         │
│   studio-ordo.com                   │
│                                     │
└─────────────────────────────────────┘
  Studio Ordo — AI Training That Ships
  Spec-driven AI training for teams...
```

---

## 3. Booking URL Constant

### Current behavior
Five `<a>` / `<Link>` elements across 4 files all hardcode `https://cal.com/alex-macaw/30min`.

### Target behavior
A single constant in `src/lib/constants.ts`:
```ts
export const BOOKING_URL = "/services/request";
```

**Rationale:** Route to the internal booking/request page rather than an external cal.com link. This keeps conversion tracking in-house and avoids exposing a third-party URL that may change. The `/services/request` page can embed or redirect to the actual booking tool.

All 5 instances replaced with `BOOKING_URL` or a direct `<Link href="/services/request">`.

---

## 4. HomeHero CTA Buttons — Before/After

### Current (inline classes)
```tsx
<Link
  href="/services"
  className="inline-flex items-center justify-center rounded-md bg-action-primary px-5 py-2.5 type-label text-text-inverse shadow-sm hover:bg-action-primary/90 motion-base focus-ring"
>
  View training tracks
</Link>
<Link
  href="/services/request"
  className="inline-flex items-center justify-center rounded-md border border-border-default bg-surface px-5 py-2.5 type-label text-text-primary hover:bg-action-secondary motion-base focus-ring"
>
  Book a technical consult
</Link>
```

### Target (using Button primitive)
```tsx
import { Button } from "@/components/primitives/button";

<Button asChild intent="primary">
  <Link href="/services">View training tracks</Link>
</Button>
<Button asChild intent="secondary">
  <Link href={BOOKING_URL}>Book a technical consult</Link>
</Button>
```

**Note:** The primitives Button doesn't currently support `asChild`. Two options:
- (a) Add `asChild` support via Radix Slot (preferred — matches shadcn convention)
- (b) Use `<Link>` wrapped in `<Button>` styling via className passthrough

**Recommendation:** Option (a) — add `asChild` to the primitives Button. This makes it composable with Next.js `<Link>` for client-side navigation.

### Visual spec
No visual change. The Button primitive already matches the inline styles. The refactor is code-only — same border radius, same padding, same tokens, same hover states.

---

## 5. About Page CTA — Before/After

### Current
```tsx
<a
  href="https://cal.com/alex-macaw/30min"
  target="_blank"
  rel="noopener noreferrer"
  className="inline-flex items-center justify-center rounded-md bg-text-primary px-6 py-3 text-sm font-medium text-bg-primary hover:bg-text-secondary transition-colors"
>
  Book a Technical Consult
</a>
```

**Problems:**
- External link to wrong person
- Uses `bg-text-primary` / `text-bg-primary` (inverted text colors as background) instead of `bg-action-primary` / `text-text-inverse`
- Uses `text-sm font-medium` instead of `type-label`
- Uses `transition-colors` instead of `motion-base`
- Uses `px-6 py-3` instead of design system spacing

### Target
```tsx
<Button asChild intent="primary">
  <Link href={BOOKING_URL}>Book a technical consult</Link>
</Button>
```

### Visual delta
Minimal — goes from inverted-text-as-background to proper action-primary blue. Padding adjusts slightly. Overall: cleaner, on-brand.

---

## 6. About Page — Blockquote

### Current
```tsx
<section className="mt-6 surface p-6">
  <p className="type-meta text-text-muted">The Origin</p>
  <h2 className="mt-2 type-title text-text-primary">What 10,000 graduates taught me.</h2>
  <div className="mt-4 space-y-3 type-body-sm italic text-text-secondary">
    <p>"I've watched 10,000 students graduate..."</p>
    ...7 paragraphs...
  </div>
</section>
```

### Target
```tsx
<section className="mt-6 surface p-6">
  <p className="type-meta text-text-muted">The Origin</p>
  <h2 className="mt-2 type-title text-text-primary">What 10,000 graduates taught me.</h2>
  <blockquote className="mt-4 space-y-3 type-body-sm italic text-text-secondary border-l-2 border-border-subtle pl-4">
    <p>I've watched 10,000 students graduate...</p>
    ...7 paragraphs...
  </blockquote>
  <cite className="mt-2 block type-meta text-text-muted not-italic">— Keith Williams, Founder</cite>
</section>
```

### Visual delta
- Left border added (2px, `border-border-subtle`)
- Left padding added (16px)
- Opening/closing quotation marks removed from the text (the `<blockquote>` element communicates "this is a quote")
- `<cite>` attribution added below

---

## 7. Button Component Strategy

### Decision
Keep **both** button components with clear separation:

| Component | Location | Purpose | When to use |
|---|---|---|---|
| `Button` (primitives) | `src/components/primitives/button.tsx` | Design-system button | All production UI — pages, layouts, interactive elements |
| `Button` (shadcn/ui) | `src/components/ui/button.tsx` | Shadcn internal primitive | Only inside shadcn compound components (Dialog, AlertDialog, etc.) |

### Change needed
Add `asChild` support to the primitives Button using Radix `Slot`, matching the shadcn convention. This makes it composable with `<Link>`:

```tsx
import { Slot } from "@radix-ui/react-slot";

const Comp = asChild ? Slot : "button";
return <Comp className={buttonVariants({ intent, size, fullWidth, className })} ref={ref} {...props} />;
```

---

## 8. Shared Metadata Helper

### Pattern
```ts
// src/lib/metadata.ts
import type { Metadata } from "next";

const SITE_NAME = "Studio Ordo";
const DEFAULT_DESCRIPTION = "Spec-driven AI training for teams and individuals. Eight capabilities, structured method, artifacts that prove how you work.";

export function buildMetadata(page: {
  title: string;
  description?: string;
  canonical: string;
  ogImage?: string;
}): Metadata {
  const description = page.description ?? DEFAULT_DESCRIPTION;
  return {
    title: page.title,
    description,
    openGraph: {
      title: `${page.title} | ${SITE_NAME}`,
      description,
      images: [page.ogImage ?? "/og-default.png"],
    },
    alternates: { canonical: page.canonical },
  };
}
```

Pages use it as:
```ts
export const metadata = buildMetadata({
  title: "About",
  description: "Built by a teacher. Powered by evidence.",
  canonical: "/about",
});
```

---

## Component Inventory

| Component | Status | Action |
|---|---|---|
| `Button` (primitives) | Exists | Add `asChild` prop |
| `Button` (shadcn) | Exists | No change — document usage rule |
| `HomeHero` | Exists | Replace inline class CTAs with `<Button>` |
| `buildMetadata` | New | Create in `src/lib/metadata.ts` |
| `BOOKING_URL` | New | Create in `src/lib/constants.ts` |
| OG image | New | Generate and place at `public/og-default.png` |

---

## Pages Touched

| Page | Changes |
|---|---|
| `src/app/layout.tsx` | Replace all "LMS 219" metadata with "Studio Ordo" branding |
| `src/app/(public)/page.tsx` | No changes (metadata already correct) |
| `src/app/(public)/about/page.tsx` | Use `BOOKING_URL`, use `<Button>`, wrap quote in `<blockquote>`, use `buildMetadata` |
| `src/app/(public)/studio/page.tsx` | Replace 2 cal.com URLs with `BOOKING_URL` |
| `src/app/(public)/apprentices/page.tsx` | Replace 1 cal.com URL with `BOOKING_URL` |
| `src/app/(public)/services/page.tsx` | Replace 1 cal.com URL with `BOOKING_URL` |
| `src/components/experiments/home-hero.tsx` | Replace inline CTA classes with `<Button>` |
| `src/components/primitives/button.tsx` | Add `asChild` support |
| `src/lib/metadata.ts` | New file — shared metadata helper |
| `src/lib/constants.ts` | Add `BOOKING_URL` constant |
