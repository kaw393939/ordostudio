# Sprint 31: Referral Fixes

## 1. Problem Statement

The referral system has two known routing errors that prevent affiliate attribution from working:

1. **`/r/[code]` redirects to `/services` instead of `/card?ref=CODE`.** Any QR code scan goes to a page that has no idea a referral happened. The `so_ref` cookie is not set. The affiliate earns no credit.

2. **The Dashboard `ReferralCard` shows a QR destination of `/r/CODE`.** This means the affiliate's QR code on their card routes correctly (through `/r/[code]`), but the URL the dashboard shows them — which they may copy and share manually — points to `/r/CODE` → `/services`. After Sprint 26 fixes the `/r/[code]` redirect, this is less critical but still incorrect. The affiliate dashboard should show them what the QR resolves to.

3. **`/affiliate` page missing key information.** Affiliates arrive at this page and don't see their commission rate, attribution window, or how to become an affiliate if they're not one yet.

From `GA-04-affiliate-flow.md`:
> "The entire referral loop from card scan to commission attribution is broken. `/r/[code]` → `/services` means no cookie, no attribution, no commission."

**Sprint 31 depends on:** Sprint 26 (`/card` exists — the redirect update in T4 of Sprint 26 may have already been done as part of that sprint, in which case T1 of this sprint is a verification task, not a new implementation).

---

## 2. Acceptance Criteria

| # | Criterion |
|---|-----------|
| 1 | `/r/[code]` redirects to `/card?ref=CODE` (not `/services`). |
| 2 | `ReferralCard` in the affiliate dashboard shows referral URL as `/card?ref=CODE`. |
| 3 | The QR code generated in `ReferralCard` encodes `/card?ref=CODE`. |
| 4 | `/affiliate` page displays commission rate (20%). |
| 5 | `/affiliate` page displays attribution window (90 days). |
| 6 | `/affiliate` page shows `"Apply to be an affiliate →"` → `/register?role=affiliate` for visitors who are not logged in or not yet affiliates. |
| 7 | `npm run build` succeeds and all tests pass. |

---

## 3. Decisions

1. **T1 may be a no-op.** If Sprint 26 T4 already updated `/r/[code]/route.ts`, this sprint's T1 is a verification step. Document it either way.

2. **Commission rate is locked at 20%.** It goes in the page as static copy. Not a variable from env. "You earn 20% of the project value for referrals you generate." One sentence.

3. **Attribution window is 90 days.** Same as the `so_ref` cookie `Max-Age`. "Referrals are attributed for 90 days after the initial scan." One sentence.

4. **`/affiliate` CTA for new visitors.** If someone lands on the affiliate page and they're not logged in or not yet an affiliate, show them a single CTA: `"Apply to be an affiliate →"` → `/register?role=affiliate` (or the correct registration path for affiliate role). This is a conversion path, not a hard gate. The existing page content stays visible; the CTA is additive.
