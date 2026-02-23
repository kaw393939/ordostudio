/**
 * Money value object.
 *
 * Encapsulates amount-in-cents + currency so arithmetic and validation
 * live in a single place instead of scattered across route handlers.
 */
import { InvalidInputError } from "./errors";

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
};

export class Money {
  readonly amountCents: number;
  readonly currency: string;

  private constructor(amountCents: number, currency: string) {
    this.amountCents = amountCents;
    this.currency = currency;
  }

  /* ── factories ─────────────────────────────────────── */

  static cents(amountCents: number, currency: string): Money {
    if (!Number.isInteger(amountCents)) {
      throw new InvalidInputError("money_amount_not_integer");
    }
    if (amountCents < 0) {
      throw new InvalidInputError("money_amount_negative");
    }
    const cur = normalizeCurrency(currency);
    return new Money(amountCents, cur);
  }

  static zero(currency: string): Money {
    return Money.cents(0, currency);
  }

  /* ── arithmetic ────────────────────────────────────── */

  add(other: Money): Money {
    assertSameCurrency(this, other);
    return new Money(this.amountCents + other.amountCents, this.currency);
  }

  subtract(other: Money): Money {
    assertSameCurrency(this, other);
    const result = this.amountCents - other.amountCents;
    return new Money(result < 0 ? 0 : result, this.currency);
  }

  /** Multiply by a decimal rate; result is floored to whole cents. */
  multiplyRate(rate: number): Money {
    return new Money(Math.floor(this.amountCents * rate), this.currency);
  }

  /* ── comparison ────────────────────────────────────── */

  equals(other: Money): boolean {
    return this.amountCents === other.amountCents && this.currency === other.currency;
  }

  isZero(): boolean {
    return this.amountCents === 0;
  }

  isPositive(): boolean {
    return this.amountCents > 0;
  }

  /* ── display ───────────────────────────────────────── */

  toString(): string {
    const dollars = (this.amountCents / 100).toFixed(2);
    const symbol = CURRENCY_SYMBOLS[this.currency];
    if (symbol) {
      return `${symbol}${dollars}`;
    }
    return `${this.currency} ${dollars}`;
  }
}

/* ── helpers ───────────────────────────────────────────── */

const normalizeCurrency = (raw: string): string => {
  const upper = raw.trim().toUpperCase();
  if (upper.length !== 3) {
    throw new InvalidInputError("money_currency_invalid");
  }
  return upper;
};

const assertSameCurrency = (a: Money, b: Money): void => {
  if (a.currency !== b.currency) {
    throw new InvalidInputError("money_currency_mismatch");
  }
};
