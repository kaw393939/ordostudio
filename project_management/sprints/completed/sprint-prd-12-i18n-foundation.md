# Sprint PRD-12 — i18n Foundation

## Severity: MEDIUM

## Goal
Establish an internationalization foundation: extract all hardcoded `"en-US"` locale references into a centralized locale configuration, create a currency formatting utility backed by the `Money` domain object, and prepare the architecture for future multi-language support without requiring it now.

## Why This Matters
All date formatting is hardcoded to `"en-US"` across 7+ source files. Currency display is hardcoded to `"USD"` in admin pages. The domain model `Money` supports multiple currencies (USD, EUR, GBP) but the UI ignores this. While full multi-language support isn't needed today, the hardcoded values create technical debt that gets harder to extract later.

## Current State (Evidence)

| What exists | Where |
|-------------|-------|
| `"en-US"` in 10+ `Intl.DateTimeFormat` calls | `src/lib/date-time.ts` |
| `"en-US"` in 3 `Intl.DateTimeFormat` calls | `src/lib/calendar-date-ui.ts` |
| `"en-US"` in 3 `Intl.DateTimeFormat` calls | `src/lib/event-date-ui.ts` |
| `"en-US"` + `"USD"` in `Intl.NumberFormat` | `src/app/(admin)/admin/referrals/page.tsx` |
| `"USD"` hardcoded in admin pages | `offers/page.tsx`, `offers/[slug]/page.tsx` |
| `"USD"` default fallback | `src/lib/api/commercial.ts` |
| `Money` value object with multi-currency support | `src/core/domain/money.ts` |
| `DATE_TIME_CONTRACT.md` documents locale pattern | Root of project |
| No i18n library | No next-intl, react-intl, or i18next |
| No translation files | No locales/ directory |

## Scope

### 1. Locale Configuration (`platform/locale.ts`)
```ts
export type SupportedLocale = "en-US";  // Extensible later
export type SupportedCurrency = "USD" | "EUR" | "GBP";

export const DEFAULT_LOCALE: SupportedLocale = "en-US";
export const DEFAULT_CURRENCY: SupportedCurrency = "USD";

// Read from env for future multi-locale deployments
export function getLocale(): SupportedLocale {
  return (process.env.APP_LOCALE as SupportedLocale) ?? DEFAULT_LOCALE;
}

export function getCurrency(): SupportedCurrency {
  return (process.env.APP_CURRENCY as SupportedCurrency) ?? DEFAULT_CURRENCY;
}
```

### 2. Centralized Date Formatting (`lib/date-time.ts` refactor)
Replace all hardcoded `"en-US"` with `getLocale()`:
```ts
// BEFORE
new Intl.DateTimeFormat("en-US", { ... })

// AFTER
new Intl.DateTimeFormat(getLocale(), { ... })
```

Apply same pattern to `calendar-date-ui.ts` and `event-date-ui.ts`.

### 3. Currency Formatting Utility (`lib/currency.ts`)
```ts
import { Money } from "@/core/domain/money";
import { getLocale, getCurrency } from "@/platform/locale";

export function formatMoney(money: Money): string {
  return new Intl.NumberFormat(getLocale(), {
    style: "currency",
    currency: money.currency ?? getCurrency(),
  }).format(money.cents() / 100);
}

export function formatCents(cents: number, currency?: string): string {
  return new Intl.NumberFormat(getLocale(), {
    style: "currency",
    currency: currency ?? getCurrency(),
  }).format(cents / 100);
}
```

### 4. Replace Hardcoded Currency in UI Files
Update all admin pages that display money values:
```ts
// BEFORE
new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount / 100)

// AFTER
formatCents(amount)
```

Files to update:
- `src/app/(admin)/admin/referrals/page.tsx`
- `src/app/(admin)/admin/offers/page.tsx`
- `src/app/(admin)/admin/offers/[slug]/page.tsx`
- `src/app/(admin)/admin/ledger/page.tsx`
- `src/app/(admin)/admin/deals/page.tsx`
- `src/app/(admin)/admin/deals/[id]/page.tsx`
- `src/app/(admin)/admin/commercial/page.tsx`

### 5. String Extraction Audit
Audit and tag all user-facing strings in the 10 highest-traffic pages with comments marking them for future extraction:
```tsx
{/* i18n: page title */}
<h1>Upcoming Events</h1>
```

This is a non-functional preparation step — no translation files yet, just documentation of what would need extraction.

### 6. Date/Number Format Tests
Verify that changing locale config changes output:
```ts
// Test that formatMoney respects locale
process.env.APP_LOCALE = "de-DE";
expect(formatCents(1500)).toBe("15,00 $"); // German format uses comma
```

## Non-Goals
- Full translation framework (next-intl, react-intl)
- Multiple language support shipping in this sprint
- RTL layout support
- Locale detection from browser `Accept-Language`
- URL-based locale routing (`/en/events`, `/de/events`)
- Translation management system

## TDD Process

### Red Phase
1. **Locale config tests** (`platform/__tests__/locale.test.ts`):
   - `getLocale()` returns `"en-US"` by default
   - `getLocale()` reads `APP_LOCALE` env var
   - `getCurrency()` returns `"USD"` by default
   - `getCurrency()` reads `APP_CURRENCY` env var

2. **Currency formatting tests** (`lib/__tests__/currency.test.ts`):
   - `formatCents(1500)` → `"$15.00"` (en-US, USD)
   - `formatCents(1500, "EUR")` → `"€15.00"` (en-US locale, EUR currency)
   - `formatMoney(Money.fromCents(999))` → `"$9.99"`
   - `formatMoney(Money.zero())` → `"$0.00"`
   - Negative amounts formatted correctly

3. **Date formatting tests** (extend existing `date-time.test.ts`):
   - Formatted dates use configured locale
   - Changing locale changes output format

4. **Admin page rendering tests**:
   - Referrals page renders money values using `formatCents`
   - Offers page renders prices using `formatCents`
   - No hardcoded `"USD"` strings in rendered output

### Green Phase — Implement locale config + formatting utils + migrate pages
### Refactor Phase — Ensure consistent formatting across all money displays

## E2E Verification Tests

### Test: "money values formatted consistently across admin pages"
```
1. Create a deal with amount 15000 cents
2. View admin deals page
3. Assert: amount displayed as "$150.00" (not "150" or "15000")
4. View admin ledger page
5. Assert: same amount formatted identically
```

### Test: "dates formatted with configured locale"
```
1. Create event with start date 2026-04-01T14:00:00Z
2. View events page
3. Assert: date displayed in en-US format (April 1, 2026)
4. Not displaying as "01/04/2026" (British) or "2026-04-01" (ISO)
```

### Test: "no hardcoded 'en-US' strings remain in source"
```
1. Grep all non-test .ts/.tsx files for literal "en-US"
2. Assert: only platform/locale.ts contains the literal
3. All other files use getLocale()
```

### Test: "currency formatting uses Money domain object"
```
1. Render component with Money.fromCents(999)
2. Assert: displays "$9.99"
3. Render with Money.fromCents(0)
4. Assert: displays "$0.00"
```

## Acceptance Criteria
- [ ] `platform/locale.ts` with `getLocale()` and `getCurrency()`
- [ ] `lib/currency.ts` with `formatMoney()` and `formatCents()`
- [ ] All `"en-US"` literals removed from non-config source files
- [ ] All `"USD"` literals removed from UI files → use `getCurrency()`
- [ ] Currency formatting uses `Intl.NumberFormat` via centralized utility
- [ ] 7+ admin pages updated to use `formatCents()`
- [ ] String extraction audit completed for 10 high-traffic pages
- [ ] Tests verify locale config affects output
- [ ] All existing tests pass
- [ ] `npm test`, `npm run lint`, `npm run build` all pass

## New Env Vars
| Variable | Default | Purpose |
|----------|---------|---------|
| `APP_LOCALE` | `"en-US"` | Application locale |
| `APP_CURRENCY` | `"USD"` | Default currency |

## End-of-Sprint Verification
```bash
npm test
npm run lint
npm run build
```
