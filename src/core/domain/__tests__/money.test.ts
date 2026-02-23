/**
 * TDD-13: Domain value objects — Money
 *
 * Tests written BEFORE implementation (RED phase).
 */
import { describe, it, expect } from "vitest";
import { Money } from "@/core/domain/money";

describe("Money — construction", () => {
  it("creates a valid Money from positive cents", () => {
    const m = Money.cents(1500, "USD");
    expect(m.amountCents).toBe(1500);
    expect(m.currency).toBe("USD");
  });

  it("creates Money.zero()", () => {
    const z = Money.zero("USD");
    expect(z.amountCents).toBe(0);
    expect(z.currency).toBe("USD");
  });

  it("throws on negative cents", () => {
    expect(() => Money.cents(-100, "USD")).toThrow();
  });

  it("throws on non-integer cents", () => {
    expect(() => Money.cents(10.5, "USD")).toThrow();
  });

  it("throws on invalid currency code (too short)", () => {
    expect(() => Money.cents(100, "US")).toThrow();
  });

  it("throws on invalid currency code (too long)", () => {
    expect(() => Money.cents(100, "USDX")).toThrow();
  });

  it("normalizes currency to uppercase", () => {
    const m = Money.cents(100, "usd");
    expect(m.currency).toBe("USD");
  });
});

describe("Money — arithmetic", () => {
  it("adds two same-currency amounts", () => {
    const a = Money.cents(1000, "USD");
    const b = Money.cents(500, "USD");
    const sum = a.add(b);
    expect(sum.amountCents).toBe(1500);
    expect(sum.currency).toBe("USD");
  });

  it("throws on adding different currencies", () => {
    expect(() => Money.cents(100, "USD").add(Money.cents(100, "EUR"))).toThrow(
      "currency",
    );
  });

  it("subtracts (clamping to zero)", () => {
    const a = Money.cents(1000, "USD");
    const b = Money.cents(300, "USD");
    expect(a.subtract(b).amountCents).toBe(700);
  });

  it("subtract clamps to zero when result would be negative", () => {
    const a = Money.cents(100, "USD");
    const b = Money.cents(500, "USD");
    expect(a.subtract(b).amountCents).toBe(0);
  });

  it("multiplies by a rate (floors)", () => {
    const m = Money.cents(1000, "USD");
    const result = m.multiplyRate(0.25);
    expect(result.amountCents).toBe(250);
  });

  it("multiplies and floors fractional results", () => {
    const m = Money.cents(333, "USD");
    const result = m.multiplyRate(0.6);
    // 333 * 0.6 = 199.8 → floor → 199
    expect(result.amountCents).toBe(199);
  });
});

describe("Money — comparison", () => {
  it("equals returns true for same amount and currency", () => {
    expect(Money.cents(100, "USD").equals(Money.cents(100, "USD"))).toBe(true);
  });

  it("equals returns false for different amount", () => {
    expect(Money.cents(100, "USD").equals(Money.cents(200, "USD"))).toBe(false);
  });

  it("equals returns false for different currency", () => {
    expect(Money.cents(100, "USD").equals(Money.cents(100, "EUR"))).toBe(false);
  });

  it("isZero returns true for zero amount", () => {
    expect(Money.zero("USD").isZero()).toBe(true);
  });

  it("isZero returns false for positive amount", () => {
    expect(Money.cents(1, "USD").isZero()).toBe(false);
  });

  it("isPositive returns true for > 0", () => {
    expect(Money.cents(1, "USD").isPositive()).toBe(true);
  });

  it("isPositive returns false for 0", () => {
    expect(Money.zero("USD").isPositive()).toBe(false);
  });
});

describe("Money — display", () => {
  it("toString formats USD amounts", () => {
    expect(Money.cents(1500, "USD").toString()).toBe("$15.00");
  });

  it("toString formats zero", () => {
    expect(Money.cents(0, "USD").toString()).toBe("$0.00");
  });

  it("toString formats EUR", () => {
    expect(Money.cents(999, "EUR").toString()).toBe("€9.99");
  });

  it("toString formats GBP", () => {
    expect(Money.cents(1234, "GBP").toString()).toBe("£12.34");
  });

  it("toString handles unknown currency", () => {
    expect(Money.cents(100, "JPY").toString()).toBe("JPY 1.00");
  });
});
