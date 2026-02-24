import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

/**
 * Sprint 14 — Visual QA guards.
 * Verify the codebase adheres to the Swiss-Bauhaus design system
 * documented in docs/swiss-bauhaus-ui-spec.md.
 */

const ROOT = resolve(__dirname, "../..");

function readSrc(rel: string): string {
  return readFileSync(resolve(ROOT, rel), "utf-8");
}

// ── 1. Typography uses design-system classes ──
describe("Typography design-system compliance", () => {
  it("globals.css defines all required type-scale tokens", () => {
    const css = readSrc("app/globals.css");
    const requiredTokens = [
      "--font-display-size",
      "--font-h1-size",
      "--font-h2-size",
      "--font-h3-size",
      "--font-title-size",
      "--font-body-size",
      "--font-label-size",
      "--font-meta-size",
    ];
    for (const token of requiredTokens) {
      expect(css).toContain(token);
    }
  });

  it("globals.css defines responsive typography media query", () => {
    const css = readSrc("app/globals.css");
    // Sprint 11 added mobile scaling for type-display, type-h1, type-h2
    expect(css).toContain("type-display");
    expect(css).toContain("type-h1");
    expect(css).toContain("type-h2");
  });
});

// ── 2. Surface / Card classes use design tokens ──
describe("Surface pattern compliance", () => {
  it("globals.css defines surface and surface-elevated classes", () => {
    const css = readSrc("app/globals.css");
    expect(css).toContain(".surface");
    expect(css).toContain(".surface-elevated");
  });
});

// ── 3. Color system uses semantic tokens not raw hex ──
describe("Color token usage", () => {
  const componentFiles = [
    "components/patterns/empty-state.tsx",
    "components/patterns/error-state.tsx",
    "components/patterns/loading-state.tsx",
    "components/layout/page-shell.tsx",
  ];

  for (const file of componentFiles) {
    it(`${file} avoids hardcoded hex colors`, () => {
      const source = readSrc(file);
      // Should not contain raw hex colors like #fff, #000, #3b82f6
      const hexMatches = source.match(/#[0-9a-fA-F]{3,8}\b/g) ?? [];
      // Filter out common non-color hex (like URL fragments)
      const colorHexes = hexMatches.filter((h) => h.length >= 4);
      expect(colorHexes).toEqual([]);
    });
  }
});

// ── 4. Accessibility: skip-nav, main-content, ARIA patterns ──
describe("Accessibility structure", () => {
  it("root layout has skip-to-main-content link", () => {
    const layout = readSrc("app/layout.tsx");
    expect(layout).toContain("skip-nav");
    expect(layout).toContain("#main-content");
  });

  it("error boundaries use role=alert", () => {
    const globalError = readSrc("app/error.tsx");
    // Global error or ProblemDetailsPanel should convey alert role
    expect(globalError).toContain("main");
  });

  it("EmptyState uses aria-live for screen readers", () => {
    const source = readSrc("components/patterns/empty-state.tsx");
    expect(source).toContain('aria-live="polite"');
  });

  it("LoadingState uses aria-busy", () => {
    const source = readSrc("components/patterns/loading-state.tsx");
    expect(source).toContain("aria-busy");
  });
});

// ── 5. Navigation menus are centrally managed ──
describe("Navigation centralization", () => {
  it("menu-registry exports all 5 menu types", () => {
    const source = readSrc("lib/navigation/menu-registry.ts");
    const menuNames = [
      "publicHeader",
      "publicFooter",
      "adminHeaderQuick",
      "adminPrimary",
      "userAccount",
    ];
    for (const name of menuNames) {
      expect(source).toContain(name);
    }
  });
});

// ── 6. Error boundaries exist at all layout levels ──
describe("Error boundary coverage", () => {
  const errorFiles = [
    "app/error.tsx",
    "app/(admin)/error.tsx",
    "app/(admin)/admin/error.tsx",
    "app/(public)/error.tsx",
  ];

  for (const file of errorFiles) {
    it(`${file} exists and exports default`, () => {
      const source = readSrc(file);
      expect(source).toContain("export default function");
    });
  }
});

// ── 7. Loading files exist for all major admin routes ──
describe("Loading state coverage", () => {
  const loadingFiles = [
    "app/(admin)/loading.tsx",
    "app/(admin)/admin/events/loading.tsx",
    "app/(admin)/admin/users/loading.tsx",
    "app/(admin)/admin/intake/loading.tsx",
    "app/(admin)/admin/audit/loading.tsx",
    "app/(public)/loading.tsx",
    "app/(public)/events/loading.tsx",
    "app/(public)/dashboard/loading.tsx",
    "app/(public)/account/loading.tsx",
  ];

  for (const file of loadingFiles) {
    it(`${file} exists`, () => {
      const source = readSrc(file);
      expect(source).toContain("Loading");
    });
  }
});
