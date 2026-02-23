import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getLocale, getCurrency, DEFAULT_LOCALE, DEFAULT_CURRENCY } from "@/platform/locale";

describe("platform/locale", () => {
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

  describe("getLocale()", () => {
    it("returns 'en-US' by default", () => {
      expect(getLocale()).toBe("en-US");
    });

    it("reads APP_LOCALE env var", () => {
      process.env.APP_LOCALE = "en-US";
      expect(getLocale()).toBe("en-US");
    });

    it("falls back to DEFAULT_LOCALE when env is unset", () => {
      delete process.env.APP_LOCALE;
      expect(getLocale()).toBe(DEFAULT_LOCALE);
    });
  });

  describe("getCurrency()", () => {
    it("returns 'USD' by default", () => {
      expect(getCurrency()).toBe("USD");
    });

    it("reads APP_CURRENCY env var", () => {
      process.env.APP_CURRENCY = "EUR";
      expect(getCurrency()).toBe("EUR");
    });

    it("falls back to DEFAULT_CURRENCY when env is unset", () => {
      delete process.env.APP_CURRENCY;
      expect(getCurrency()).toBe(DEFAULT_CURRENCY);
    });
  });

  describe("exports", () => {
    it("exports DEFAULT_LOCALE as 'en-US'", () => {
      expect(DEFAULT_LOCALE).toBe("en-US");
    });

    it("exports DEFAULT_CURRENCY as 'USD'", () => {
      expect(DEFAULT_CURRENCY).toBe("USD");
    });
  });
});
