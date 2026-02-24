import { describe, expect, it, vi, beforeEach } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

// ── 1. Font optimisation ──
describe("Font loading (next/font)", () => {
  it("root layout imports Inter from next/font/google", () => {
    const layoutPath = resolve(__dirname, "../../app/layout.tsx");
    const source = readFileSync(layoutPath, "utf-8");
    expect(source).toContain("next/font/google");
    expect(source).toContain("Inter");
    expect(source).toContain('display: "swap"');
  });

  it("CSS --font-sans resolves to --font-inter", () => {
    const cssPath = resolve(__dirname, "../../app/globals.css");
    const source = readFileSync(cssPath, "utf-8");
    expect(source).toContain("--font-inter");
    // The --font-sans variable should reference Inter, not geist
    expect(source).toMatch(/--font-sans:\s*var\(--font-inter/);
  });
});

// ── 2. Dynamic imports ──
describe("Dynamic imports for heavy components", () => {
  it("event detail page uses next/dynamic for Countdown", () => {
    const pagePath = resolve(
      __dirname,
      "../../app/(public)/events/[slug]/page-client.tsx",
    );
    const source = readFileSync(pagePath, "utf-8");
    expect(source).toContain("next/dynamic");
    expect(source).toContain("countdown");
    // Should NOT have a static import of Countdown
    expect(source).not.toMatch(/^import\s+\{\s*Countdown\s*\}/m);
  });
});

// ── 3. CLS prevention ──
describe("CLS prevention", () => {
  it("QR code image in referral-card has explicit dimensions", () => {
    const filePath = resolve(
      __dirname,
      "../../app/(public)/dashboard/referral-card.tsx",
    );
    const source = readFileSync(filePath, "utf-8");
    // Must have width and height attributes on the <img>
    expect(source).toMatch(/width=\{?\d+\}?/);
    expect(source).toMatch(/height=\{?\d+\}?/);
  });

  it("all loading.tsx files use LoadingState (no bare text)", () => {
    const loadingFiles = [
      "../../app/(admin)/admin/events/loading.tsx",
      "../../app/(admin)/admin/users/loading.tsx",
      "../../app/(admin)/admin/intake/loading.tsx",
      "../../app/(admin)/admin/audit/loading.tsx",
      "../../app/(admin)/admin/commercial/loading.tsx",
      "../../app/(public)/account/loading.tsx",
      "../../app/(public)/login/loading.tsx",
      "../../app/(public)/register/loading.tsx",
    ];
    for (const rel of loadingFiles) {
      const source = readFileSync(resolve(__dirname, rel), "utf-8");
      expect(source).toContain("LoadingState");
    }
  });
});

// ── 4. Analytics stub ──
import { analytics } from "@/lib/analytics";

describe("Analytics facade", () => {
  beforeEach(() => {
    vi.spyOn(console, "debug").mockImplementation(() => {});
  });

  it("capture logs in development without throwing", () => {
    expect(() => analytics.capture("test_event", { foo: "bar" })).not.toThrow();
  });

  it("identify logs user identity without throwing", () => {
    expect(() => analytics.identify("user-123", { plan: "pro" })).not.toThrow();
  });

  it("reset completes without throwing", () => {
    expect(() => analytics.reset()).not.toThrow();
  });

  it("init completes without throwing", () => {
    expect(() => analytics.init()).not.toThrow();
  });
});

// ── 5. Lighthouse infrastructure already exists ──
describe("Lighthouse CI infrastructure", () => {
  it("lighthouse route budgets file exists and defines public tier", () => {
    const budgetsPath = resolve(
      __dirname,
      "../../../scripts/lighthouse-route-budgets.json",
    );
    const budgets = JSON.parse(readFileSync(budgetsPath, "utf-8"));
    expect(budgets.tierBudgets.public).toBeDefined();
    expect(budgets.tierBudgets.public.performance).toBeGreaterThanOrEqual(80);
  });

  it("bundle size check script exists", () => {
    const scriptPath = resolve(
      __dirname,
      "../../../scripts/check-bundle-sizes.mjs",
    );
    const source = readFileSync(scriptPath, "utf-8");
    expect(source).toContain("BUNDLE_MAX_GZIP_KB");
  });
});
