# Sprint 30: `/apply` Flow — Sprint Plan

## 1. Tasks

### T1: Audit Current `/apply` Route and Sub-Forms
- **Action:**
  1. Check whether `src/app/(public)/apply/page.tsx` exists and what it returns.
  2. Read `src/app/(public)/apply/apprentice/page.tsx` — note current fields, field types, component imports.
  3. Read `src/app/(public)/apply/affiliate/page.tsx` — locate the dead `useEffect` block, note current fields.
  4. Confirm whether `/apply/journeyman` also has the same missing-field pattern (out of scope for fixes but worth noting).

---

### T2: Create `/apply` Index Page
- **File:** `src/app/(public)/apply/page.tsx`
- **Action:** Create server component with three path cards:
  ```tsx
  import Link from "next/link";

  export const metadata = {
    title: "Apply — Studio Ordo",
    description: "Apply to the Studio Ordo guild as Apprentice, Journeyman, or Affiliate.",
  };

  const paths = [
    {
      title: "Apprentice",
      description:
        "You want to learn and work. You're building your craft inside a real project with guild oversight.",
      href: "/apply/apprentice",
    },
    {
      title: "Journeyman",
      description:
        "You have experience. You want access to guild projects and a professional practice context.",
      href: "/apply/journeyman",
    },
    {
      title: "Affiliate",
      description:
        "You refer work. You get a referral code and QR card. You earn commission on conversions.",
      href: "/apply/affiliate",
    },
  ];

  export default function ApplyPage() {
    return (
      <main id="main-content" className="container-grid py-6">
        <h1 className="type-title text-text-primary">Apply to the guild.</h1>
        <div className="mt-6 flex flex-col gap-3">
          {paths.map((p) => (
            <Link
              key={p.href}
              href={p.href}
              className="surface border-border border rounded p-5 block hover:bg-bg-subtle transition-colors"
            >
              <span className="type-label text-text-primary block">{p.title}</span>
              <span className="type-body-sm text-text-secondary block mt-1">{p.description}</span>
            </Link>
          ))}
        </div>
      </main>
    );
  }
  ```

---

### T3: Fix `/apply/apprentice` Form Fields
- **File:** `src/app/(public)/apply/apprentice/page.tsx` (or the form component it uses)
- **Action:**
  1. Change `experience` field from `<Input>` to `<Textarea>` with label `"Tell us about your background and what brings you here"`.
  2. Add `current_role` field: `<Input type="text" label="Your current job title or role" name="current_role" />`.
  3. Add `years_experience` field: `<Input type="number" label="Years of professional experience" name="years_experience" min={0} />` (or a select if preferred by existing form patterns).
  4. Add `so_ref` cookie read:
     ```tsx
     useEffect(() => {
       const match = document.cookie.match(/(?:^|;\s*)so_ref=([^;]+)/);
       if (match) setReferralCode(decodeURIComponent(match[1]));
     }, []);
     ```
     Include `referralCode` as a hidden field in the submission payload.

---

### T4: Fix `/apply/affiliate` Form
- **File:** `src/app/(public)/apply/affiliate/page.tsx` (or the form component it uses)
- **Action:**
  1. Remove the dead `useEffect` block with the TODO comment. Note what the TODO said before deleting, in case it describes needed functionality — if so, document it in a code comment or file a separate task.
  2. Add `platform` field: `<Input type="text" label="Where do you share content or refer work?" name="platform" placeholder="LinkedIn, GitHub, community, etc." />`.
  3. Add `audience_description` field: `<Textarea label="Who's in your audience or network?" name="audience_description" />`.

---

### T5: Verify + Build
- **Action:**
  1. `npx vitest run` — no new failures.
  2. `npm run build` — no errors.
  3. Manual: `/apply` returns 200 with three path cards.
  4. Manual: `/apply/apprentice` shows textarea for experience, new fields present.
  5. Manual: set `so_ref` cookie manually in browser devtools; reload `/apply/apprentice`; confirm hidden referral field has value in form submission (check network payload on submit).
  6. Manual: `/apply/affiliate` loads without errors; dead `useEffect` gone; two new fields present.

---

## 2. Dependency Graph

```
T1 (audit)
     │
     ▼
T2 (/apply index — no deps within sprint)
T3 (apprentice fixes)
T4 (affiliate fixes)
     │
     ▼
T5 (verify + build)
```
