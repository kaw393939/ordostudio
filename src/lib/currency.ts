/**
 * Currency formatting utilities.
 *
 * Uses the centralized locale configuration from `@/platform/locale`
 * and the `Money` domain object for type-safe currency formatting.
 */

import { Money } from "@/core/domain/money";
import { getLocale, getCurrency } from "@/platform/locale";

/**
 * Formats a `Money` value object using `Intl.NumberFormat`.
 *
 * Uses the money's own currency, falling back to the app default.
 *
 * @example
 * formatMoney(Money.cents(999, "USD")) // → "$9.99"
 * formatMoney(Money.cents(1500, "EUR")) // → "€15.00"
 */
export function formatMoney(money: Money): string {
  return new Intl.NumberFormat(getLocale(), {
    style: "currency",
    currency: money.currency || getCurrency(),
  }).format(money.amountCents / 100);
}

/**
 * Formats a raw cents value using `Intl.NumberFormat`.
 *
 * @param cents - Amount in cents (e.g. 1500 = $15.00)
 * @param currency - ISO 4217 currency code; defaults to app currency
 *
 * @example
 * formatCents(1500)        // → "$15.00"
 * formatCents(1500, "EUR") // → "€15.00"
 * formatCents(0)           // → "$0.00"
 */
export function formatCents(cents: number, currency?: string): string {
  return new Intl.NumberFormat(getLocale(), {
    style: "currency",
    currency: currency ?? getCurrency(),
  }).format(cents / 100);
}
