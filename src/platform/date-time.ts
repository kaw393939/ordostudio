/**
 * Platform-layer date/time utilities.
 *
 * Core parsing functions that are safe to use from any layer including
 * domain entities and use-cases. Display/formatting functions remain in
 * the delivery layer (src/lib/date-time.ts).
 */

/** Returns the current time as a UTC ISO 8601 string. */
export function nowISO(): string {
  return new Date().toISOString();
}

/**
 * Parses an ISO 8601 string into a Date.
 * Throws if the value is invalid.
 */
export function parseISO(value: string): Date {
  if (!value) throw new Error("Empty date string");
  const d = new Date(value);
  if (isNaN(d.getTime())) throw new Error(`Invalid date: "${value}"`);
  // Validate month didn't overflow (e.g., month 13)
  if (value.match(/^\d{4}-(\d{2})/)) {
    const monthStr = value.match(/^\d{4}-(\d{2})/)![1];
    const month = parseInt(monthStr, 10);
    if (month < 1 || month > 12) throw new Error(`Invalid date: "${value}"`);
  }
  return d;
}

/** Returns true if the value is a valid ISO 8601 date string. */
export function isValidISO(value: string): boolean {
  try {
    parseISO(value);
    return true;
  } catch {
    return false;
  }
}
