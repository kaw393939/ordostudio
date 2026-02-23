import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { formatCents, formatMoney } from "@/lib/currency";
import { Money } from "@/core/domain/money";

describe("lib/currency", () => {
  const savedLocale = process.env.APP_LOCALE;
  const savedCurrency = process.env.APP_CURRENCY;

  beforeEach(() => {
    delete process.env.APP_LOCALE;
    delete process.env.APP_CURRENCY;
  });

  afterEach(() => {
    if (savedLocale !== undefined) {
      process.env.APP_LOCALE = savedLocale;
    } else {
      delete process.env.APP_LOCALE;
    }
    if (savedCurrency !== undefined) {
      process.env.APP_CURRENCY = savedCurrency;
    } else {
      delete process.env.APP_CURRENCY;
    }
  });

  describe("formatCents()", () => {
    it("formats 1500 cents as $15.00 (en-US, USD default)", () => {
      expect(formatCents(1500)).toBe("$15.00");
    });

    it("formats 0 cents as $0.00", () => {
      expect(formatCents(0)).toBe("$0.00");
    });

    it("formats 999 cents as $9.99", () => {
      expect(formatCents(999)).toBe("$9.99");
    });

    it("formats 1 cent as $0.01", () => {
      expect(formatCents(1)).toBe("$0.01");
    });

    it("formats with explicit EUR currency", () => {
      const result = formatCents(1500, "EUR");
      // en-US locale with EUR currency uses €
      expect(result).toContain("€");
      expect(result).toContain("15.00");
    });

    it("formats with explicit GBP currency", () => {
      const result = formatCents(1500, "GBP");
      // en-US locale with GBP currency uses £
      expect(result).toContain("£");
      expect(result).toContain("15.00");
    });

    it("uses configured currency from env", () => {
      process.env.APP_CURRENCY = "EUR";
      const result = formatCents(1500);
      expect(result).toContain("€");
      expect(result).toContain("15.00");
    });

    it("formats large amounts with grouping", () => {
      const result = formatCents(1000000);
      // $10,000.00
      expect(result).toContain("10,000.00");
    });
  });

  describe("formatMoney()", () => {
    it("formats Money.cents(999, 'USD') as $9.99", () => {
      expect(formatMoney(Money.cents(999, "USD"))).toBe("$9.99");
    });

    it("formats Money.zero('USD') as $0.00", () => {
      expect(formatMoney(Money.zero("USD"))).toBe("$0.00");
    });

    it("formats Money with EUR currency", () => {
      const result = formatMoney(Money.cents(1500, "EUR"));
      expect(result).toContain("€");
      expect(result).toContain("15.00");
    });

    it("formats Money with GBP currency", () => {
      const result = formatMoney(Money.cents(2500, "GBP"));
      expect(result).toContain("£");
      expect(result).toContain("25.00");
    });

    it("formats large Money values", () => {
      const result = formatMoney(Money.cents(15000, "USD"));
      expect(result).toBe("$150.00");
    });
  });
});
