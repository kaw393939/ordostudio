/**
 * Centralized locale configuration.
 *
 * All date/time and currency formatting in the application should use
 * these functions instead of hardcoding locale or currency strings.
 * This establishes the foundation for future multi-locale deployments.
 */

export type SupportedLocale = "en-US";
export type SupportedCurrency = "USD" | "EUR" | "GBP";

export const DEFAULT_LOCALE: SupportedLocale = "en-US";
export const DEFAULT_CURRENCY: SupportedCurrency = "USD";

/**
 * Returns the configured application locale.
 * Reads from `APP_LOCALE` env var, falling back to `"en-US"`.
 */
export function getLocale(): SupportedLocale {
  return (process.env.APP_LOCALE as SupportedLocale) ?? DEFAULT_LOCALE;
}

/**
 * Returns the configured default currency.
 * Reads from `APP_CURRENCY` env var, falling back to `"USD"`.
 */
export function getCurrency(): SupportedCurrency {
  return (process.env.APP_CURRENCY as SupportedCurrency) ?? DEFAULT_CURRENCY;
}
