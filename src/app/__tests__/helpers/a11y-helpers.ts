import { configureAxe, toHaveNoViolations } from "jest-axe";
import { expect } from "vitest";

// Extend vitest matchers with jest-axe's toHaveNoViolations
expect.extend(toHaveNoViolations);

/**
 * Pre-configured axe instance with sensible defaults for our stack.
 *
 * Excludions:
 * - `color-contrast` — our design-token system uses CSS custom properties
 *   which jsdom cannot resolve; this is verified manually against token values.
 * - `region` — we intentionally render skip-nav outside landmark regions.
 */
export const axe = configureAxe({
  rules: {
    // CSS custom properties (--text-primary etc.) can't be computed by jsdom
    "color-contrast": { enabled: false },
    // skip-nav link is intentionally outside landmark regions
    region: { enabled: false },
  },
});

/**
 * Run an axe-core audit on the provided HTML container and assert no violations.
 *
 * Usage:
 * ```ts
 * const { container } = render(<MyComponent />);
 * await expectNoA11yViolations(container);
 * ```
 */
export async function expectNoA11yViolations(container: HTMLElement) {
  const results = await axe(container);
  expect(results).toHaveNoViolations();
}
