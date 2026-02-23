// @vitest-environment node

/**
 * E2E verification tests for PRD-12: i18n Foundation.
 *
 * Tests verify:
 * 1. No hardcoded "en-US" strings remain in non-config source files
 * 2. No hardcoded "USD" strings remain in UI files
 * 3. Currency formatting uses centralized utility
 * 4. Date formatting uses centralized locale
 * 5. Money domain object integrates with formatting
 * 6. Locale config affects formatter output
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { getLocale, getCurrency } from "@/platform/locale";
import { formatCents, formatMoney } from "@/lib/currency";
import { Money } from "@/core/domain/money";

/* ── helper: recursively collect .ts/.tsx files ─────────── */

function collectFiles(dir: string, pattern: RegExp): string[] {
  const results: string[] = [];
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".next") continue;
      results.push(...collectFiles(fullPath, pattern));
    } else if (pattern.test(entry.name)) {
      results.push(fullPath);
    }
  }
  return results;
}

const SRC_ROOT = join(__dirname, "../../");

describe("PRD-12: i18n Foundation — source audit", () => {
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

  describe("no hardcoded 'en-US' in non-config source files", () => {
    it("only platform/locale.ts contains the literal 'en-US'", () => {
      const sourceFiles = collectFiles(SRC_ROOT, /\.(ts|tsx)$/);

      const violations: string[] = [];
      const allowedFiles = [
        "platform/locale.ts",    // Config source — allowed
        "platform/__tests__",    // Test files — allowed
        "__tests__",             // All test files — allowed
      ];

      for (const file of sourceFiles) {
        const relativePath = relative(SRC_ROOT, file);
        const isAllowed = allowedFiles.some((allowed) => relativePath.includes(allowed));
        if (isAllowed) continue;

        const content = readFileSync(file, "utf-8");
        // Match literal "en-US" string (not in comments)
        const lines = content.split("\n");
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          // Skip comment-only lines and i18n marker comments
          if (line.trim().startsWith("//") || line.trim().startsWith("*") || line.trim().startsWith("{/*")) continue;
          if (line.includes('"en-US"') || line.includes("'en-US'")) {
            violations.push(`${relativePath}:${i + 1}: ${line.trim()}`);
          }
        }
      }

      expect(violations).toEqual([]);
    });
  });

  describe("no hardcoded 'USD' in UI files", () => {
    it("no hardcoded 'USD' string literals in page.tsx or client component files", () => {
      const uiFiles = collectFiles(SRC_ROOT, /\.(tsx)$/).filter((f) => {
        const rel = relative(SRC_ROOT, f);
        return (
          !rel.includes("__tests__") &&
          !rel.includes("node_modules") &&
          !rel.includes("platform/locale")
        );
      });

      const violations: string[] = [];

      for (const file of uiFiles) {
        const relativePath = relative(SRC_ROOT, file);
        const content = readFileSync(file, "utf-8");
        const lines = content.split("\n");
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (line.trim().startsWith("//") || line.trim().startsWith("*") || line.trim().startsWith("{/*")) continue;
          // Match "USD" as a standalone string literal, not as part of getCurrency() usage
          if ((line.includes('"USD"') || line.includes("'USD'")) && !line.includes("getCurrency()")) {
            // Allow placeholder text like "e.g., USD"
            if (line.includes("e.g.,")) continue;
            violations.push(`${relativePath}:${i + 1}: ${line.trim()}`);
          }
        }
      }

      expect(violations).toEqual([]);
    });
  });

  describe("currency formatting uses centralized utility", () => {
    it("formatCents(1500) returns $15.00 with default locale/currency", () => {
      expect(formatCents(1500)).toBe("$15.00");
    });

    it("formatMoney with Money domain object returns formatted string", () => {
      const money = Money.cents(999, "USD");
      expect(formatMoney(money)).toBe("$9.99");
    });

    it("formatMoney respects Money currency field", () => {
      const eur = Money.cents(1500, "EUR");
      const result = formatMoney(eur);
      expect(result).toContain("€");
      expect(result).toContain("15.00");
    });

    it("formatCents(0) returns $0.00", () => {
      expect(formatCents(0)).toBe("$0.00");
    });
  });

  describe("date formatting uses centralized locale", () => {
    it("date-time.ts imports getLocale from platform/locale", () => {
      const dateTimePath = join(SRC_ROOT, "lib/date-time.ts");
      const content = readFileSync(dateTimePath, "utf-8");
      expect(content).toContain('import { getLocale } from "@/platform/locale"');
    });

    it("calendar-date-ui.ts imports getLocale from platform/locale", () => {
      const calendarPath = join(SRC_ROOT, "lib/calendar-date-ui.ts");
      const content = readFileSync(calendarPath, "utf-8");
      expect(content).toContain('import { getLocale } from "@/platform/locale"');
    });

    it("event-date-ui.ts imports getLocale from platform/locale", () => {
      const eventPath = join(SRC_ROOT, "lib/event-date-ui.ts");
      const content = readFileSync(eventPath, "utf-8");
      expect(content).toContain('import { getLocale } from "@/platform/locale"');
    });
  });

  describe("locale config affects output", () => {
    it("getLocale() returns configured locale", () => {
      expect(getLocale()).toBe("en-US");
    });

    it("getCurrency() returns configured currency", () => {
      expect(getCurrency()).toBe("USD");
    });

    it("APP_CURRENCY env changes formatCents output", () => {
      process.env.APP_CURRENCY = "EUR";
      const result = formatCents(1500);
      expect(result).toContain("€");
      expect(result).toContain("15.00");
    });
  });

  describe("env vars documented", () => {
    it("APP_LOCALE is in .env.example", () => {
      const envExample = readFileSync(join(SRC_ROOT, "../.env.example"), "utf-8");
      expect(envExample).toContain("APP_LOCALE");
    });

    it("APP_CURRENCY is in .env.example", () => {
      const envExample = readFileSync(join(SRC_ROOT, "../.env.example"), "utf-8");
      expect(envExample).toContain("APP_CURRENCY");
    });
  });

  describe("i18n string audit", () => {
    it("audit document exists", () => {
      const auditPath = join(SRC_ROOT, "../docs/i18n-string-audit.md");
      const content = readFileSync(auditPath, "utf-8");
      expect(content).toContain("i18n String Extraction Audit");
      expect(content).toContain("Home Page");
      expect(content).toContain("Login");
      expect(content).toContain("Register");
      expect(content).toContain("Events List");
      expect(content).toContain("Account");
    });

    it("i18n marker comments exist in key pages", () => {
      const loginPage = readFileSync(join(SRC_ROOT, "app/(public)/login/page.tsx"), "utf-8");
      expect(loginPage).toContain("{/* i18n:");

      const registerPage = readFileSync(join(SRC_ROOT, "app/(public)/register/page.tsx"), "utf-8");
      expect(registerPage).toContain("{/* i18n:");
    });
  });
});
