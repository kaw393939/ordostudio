# Sprint 31: Referral Fixes — Sprint Plan

## 1. Tasks

### T1: Verify `/r/[code]` Redirect Status
- **File:** `src/app/r/[code]/route.ts`
- **Action:** Read the file. Check whether Sprint 26 T4 already updated the redirect from `/services` to `/card?ref=CODE`.
  - **If already done:** T1 is a verification task only. Confirm the redirect destination is `/card?ref=CODE` and the code is passed correctly. Document as verified.
  - **If not yet done:** Update redirect:
    ```ts
    // Before
    return NextResponse.redirect(new URL("/services", request.url));
    // After
    return NextResponse.redirect(new URL(`/card?ref=${code.toUpperCase()}`, request.url));
    ```

---

### T2: Update `ReferralCard` QR Destination
- **Action:** Search for `ReferralCard` component (grep for component name). Find where it generates the QR code URL and the displayed referral URL.
  - Update the URL from `\`/r/${code}\`` to `\`/card?ref=${code}\`` (or the full base URL equivalent).
  - If the component uses a `referral_url` prop or derives it from a helper, update that derivation.
  - After the change, the QR encodes the correct URL and the displayed text shows `studioordo.com/card?ref=MYCODE`.

---

### T3: Update `/affiliate` Page
- **File:** Wherever the `/affiliate` public page component lives.
- **Action:** Add a section below existing content:
  ```tsx
  <section className="mt-6 surface p-6">
    <p className="type-body-sm text-text-secondary">
      Commission: 20% of the project fee on any referred project that converts.
    </p>
    <p className="mt-2 type-body-sm text-text-secondary">
      Attribution window: 90 days from initial scan.
    </p>
    {/* Conditionally render for non-affiliate visitors */}
    {!isAffiliate && (
      <div className="mt-4">
        <Button asChild intent="primary">
          <Link href="/apply/affiliate">Apply to be an affiliate →</Link>
        </Button>
      </div>
    )}
  </section>
  ```
  - Check how the current `/affiliate` page determines logged-in status and role. Use the same pattern.
  - If the page is a server component with no auth check, add CTA unconditionally for now — a logged-in affiliate will see their portal content above it, so the CTA is harmless.

---

### T4: Verify or Implement `/api/v1/referrals/resolve` Endpoint
- **Action:** Check whether Sprint 26 T5 created this endpoint.
  - **If already done:** Verify it returns `{ first_name: string }` for a valid code and 404 for unknown codes. Confirm the `/card` page attribution line renders correctly end-to-end.
  - **If not yet done (Sprint 26 T5 was deferred):** Create the minimal route:
    ```
    src/app/api/v1/referrals/resolve/route.ts
    ```
    Reads `?code=CODE` query param, looks up the referral code in the DB, returns `{ first_name }` on match or 404. Use the same DB access pattern as other routes in this project (`openCliDb()` or the equivalent request-scoped DB helper).

---

### T5: Verify + Build
- **Action:**
  1. `npx vitest run` — no new failures.
  2. `npm run build` — no errors.
  3. Manual: `/r/TESTCODE` redirects to `/card?ref=TESTCODE`.
  4. Manual: Affiliate dashboard `ReferralCard` shows URL `studioordo.com/card?ref=MYCODE`.
  5. Manual: `/affiliate` shows commission rate and attribution window.
  6. Manual: `"Apply to be an affiliate →"` button visible and routes to `/apply/affiliate`.
  7. Manual: `/card?ref=VALIDCODE` shows `"You were referred by [Name]."` attribution line.

---

## 2. Dependency Graph

```
T1 (/r/[code] redirect — may be no-op if S26 T4 done)
T2 (ReferralCard QR URL — independent)
T3 (/affiliate page additions — independent)
T4 (referral resolve endpoint — may be no-op if S26 T5 done)
     │
     ▼
T5 (verify + build — includes end-to-end attribution line test)
```
