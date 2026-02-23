/**
 * Accessibility Audit Tests (PRD-10)
 *
 * Runtime DOM-based accessibility assertions using jest-axe (axe-core)
 * and @testing-library/react.
 */
import { render } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { expectNoA11yViolations } from "./helpers/a11y-helpers";

// ──── Mock next/navigation ───────────────────────────────────

const mockPush = vi.fn();
const mockPathname = vi.fn(() => "/");
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => mockPathname(),
  useSearchParams: () => new URLSearchParams(),
}));

// ──── Mock next/link ─────────────────────────────────────────

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string; [k: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

// ──── Tests ──────────────────────────────────────────────────

describe("a11y accessibility audit (PRD-10)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPathname.mockReturnValue("/");
  });

  describe("skip-to-content link", () => {
    it("root layout has a skip-nav link targeting #main-content", async () => {
      // We can't easily render the server component layout in jsdom,
      // so we verify the structure by reading source.
      const { readFile } = await import("node:fs/promises");
      const { join } = await import("node:path");
      const src = await readFile(join(process.cwd(), "src/app/layout.tsx"), "utf8");

      expect(src).toContain('href="#main-content"');
      expect(src).toContain('className="skip-nav"');
      expect(src).toContain("Skip to main content");
    });

    it("skip-nav CSS transitions from hidden to visible on focus", async () => {
      const { readFile } = await import("node:fs/promises");
      const { join } = await import("node:path");
      const css = await readFile(join(process.cwd(), "src/app/globals.css"), "utf8");

      // Hidden by default (translated off-screen)
      expect(css).toContain("translateY(-200%)");
      // Visible on focus
      expect(css).toContain(".skip-nav:focus");
      expect(css).toContain("translateY(0)");
      // Accessible focus ring
      expect(css).toContain("outline: 2px solid");
    });

    it("PageShell component has id=main-content and tabIndex=-1", async () => {
      const { readFile } = await import("node:fs/promises");
      const { join } = await import("node:path");
      const src = await readFile(join(process.cwd(), "src/components/layout/page-shell.tsx"), "utf8");

      expect(src).toContain('id="main-content"');
      expect(src).toContain("tabIndex={-1}");
    });
  });

  describe("RouteAnnouncer", () => {
    it("renders with aria-live=assertive and role=status", async () => {
      const { RouteAnnouncer } = await import("../../components/route-announcer");
      const { container } = render(<RouteAnnouncer />);

      const announcer = container.querySelector("[aria-live]");
      expect(announcer).toBeTruthy();
      expect(announcer?.getAttribute("aria-live")).toBe("assertive");
      expect(announcer?.getAttribute("aria-atomic")).toBe("true");
      expect(announcer?.getAttribute("role")).toBe("status");
      expect(announcer?.getAttribute("tabindex")).toBe("-1");
    });

    it("contains the current pathname", async () => {
      mockPathname.mockReturnValue("/events");
      const { RouteAnnouncer } = await import("../../components/route-announcer");
      const { container } = render(<RouteAnnouncer />);

      const announcer = container.querySelector("[aria-live]");
      expect(announcer?.textContent).toContain("/events");
    });

    it("is visually hidden (sr-only class)", async () => {
      const { RouteAnnouncer } = await import("../../components/route-announcer");
      const { container } = render(<RouteAnnouncer />);

      const announcer = container.querySelector("[aria-live]");
      expect(announcer?.className).toContain("sr-only");
    });

    it("passes axe audit", async () => {
      const { RouteAnnouncer } = await import("../../components/route-announcer");
      const { container } = render(<RouteAnnouncer />);
      await expectNoA11yViolations(container);
    });
  });

  describe("admin layout accessibility", () => {
    it("admin access-guard loading state has main-content id and aria-busy", async () => {
      const { readFile } = await import("node:fs/promises");
      const { join } = await import("node:path");
      const src = await readFile(join(process.cwd(), "src/app/(admin)/admin/layout.tsx"), "utf8");

      // Loading state should have id="main-content" and aria-busy
      expect(src).toContain('id="main-content"');
      expect(src).toContain("aria-busy");
      expect(src).toContain("tabIndex={-1}");
    });

    it("admin access-guard error state has role=alert", async () => {
      const { readFile } = await import("node:fs/promises");
      const { join } = await import("node:path");
      const src = await readFile(join(process.cwd(), "src/app/(admin)/admin/layout.tsx"), "utf8");

      expect(src).toContain('role="alert"');
    });
  });

  describe("html lang attribute", () => {
    it("root layout declares lang=en on html element", async () => {
      const { readFile } = await import("node:fs/promises");
      const { join } = await import("node:path");
      const src = await readFile(join(process.cwd(), "src/app/layout.tsx"), "utf8");

      expect(src).toContain('lang="en"');
    });
  });

  describe("login page axe audit", () => {
    beforeEach(() => {
      mockPathname.mockReturnValue("/login");
    });

    it("renders with accessible form structure", async () => {
      // Mock the HAL client to prevent actual API calls
      vi.doMock("../../lib/hal-client", () => ({
        mutateProblem: vi.fn(),
        requestHal: vi.fn(),
      }));

      const { default: LoginPage } = await import("../(public)/login/page");
      const { container } = render(<LoginPage />);

      // Has main content area
      const main = container.querySelector("#main-content");
      expect(main).toBeTruthy();

      // Has form element
      const form = container.querySelector("form");
      expect(form).toBeTruthy();

      // Has labeled email input
      const emailInput = container.querySelector('input[type="email"]') ?? container.querySelector('input[name="email"]');
      expect(emailInput).toBeTruthy();

      // Email input has associated label
      const emailId = emailInput?.getAttribute("id");
      if (emailId) {
        const label = container.querySelector(`label[for="${emailId}"]`);
        expect(label).toBeTruthy();
      }

      // Has password input
      const passwordInput = container.querySelector('input[type="password"]');
      expect(passwordInput).toBeTruthy();

      // Has submit button
      const submitButton = container.querySelector('button[type="submit"]');
      expect(submitButton).toBeTruthy();

      // Run axe audit
      await expectNoA11yViolations(container);

      vi.doUnmock("../../lib/hal-client");
    });
  });

  describe("register page axe audit", () => {
    beforeEach(() => {
      mockPathname.mockReturnValue("/register");
    });

    it("renders with accessible form structure", async () => {
      vi.doMock("../../lib/hal-client", () => ({
        mutateProblem: vi.fn(),
        requestHal: vi.fn(),
      }));

      const { default: RegisterPage } = await import("../(public)/register/page");
      const { container } = render(<RegisterPage />);

      // Has main content area
      const main = container.querySelector("#main-content");
      expect(main).toBeTruthy();

      // Has form
      const form = container.querySelector("form");
      expect(form).toBeTruthy();

      // Has email field
      const emailInput = container.querySelector('input[type="email"]') ?? container.querySelector('input[name="email"]');
      expect(emailInput).toBeTruthy();

      // Has password fields (password + confirm)
      const passwordInputs = container.querySelectorAll('input[type="password"]');
      expect(passwordInputs.length).toBeGreaterThanOrEqual(2);

      // Has terms checkbox
      const checkbox = container.querySelector('input[type="checkbox"]') ?? container.querySelector('[role="checkbox"]');
      expect(checkbox).toBeTruthy();

      // Has submit button
      const submitButton = container.querySelector('button[type="submit"]');
      expect(submitButton).toBeTruthy();

      // Run axe audit
      await expectNoA11yViolations(container);

      vi.doUnmock("../../lib/hal-client");
    });
  });

  describe("form component accessibility", () => {
    it("PasswordInput has toggleable visibility with accessible button", async () => {
      const { PasswordInput } = await import("../../components/forms/password-input");
      const { container } = render(
        <div>
          <label htmlFor="test-pw">Password</label>
          <PasswordInput id="test-pw" />
        </div>
      );

      const toggleBtn = container.querySelector('button[type="button"]');
      expect(toggleBtn).toBeTruthy();
      // Toggle button should have accessible name
      const ariaLabel = toggleBtn?.getAttribute("aria-label");
      const srText = toggleBtn?.querySelector(".sr-only");
      expect(ariaLabel || srText).toBeTruthy();

      await expectNoA11yViolations(container);
    });

    it("SubmitButton has accessible loading state", async () => {
      const { SubmitButton } = await import("../../components/forms/submit-button");
      const { container } = render(
        <form>
          <SubmitButton>Submit</SubmitButton>
        </form>
      );

      const button = container.querySelector('button[type="submit"]');
      expect(button).toBeTruthy();
      expect(button?.textContent).toContain("Submit");

      await expectNoA11yViolations(container);
    });
  });

  describe("focus-visible affordances", () => {
    it("button primitive has focus-visible ring styles", async () => {
      const { readFile } = await import("node:fs/promises");
      const { join } = await import("node:path");
      const src = await readFile(join(process.cwd(), "src/components/primitives/button.tsx"), "utf8");

      expect(src).toContain("focus-visible:ring-2");
      expect(src).toContain("focus-visible:ring-focus-ring");
    });

    it("input primitive has focus-visible ring styles", async () => {
      const { readFile } = await import("node:fs/promises");
      const { join } = await import("node:path");
      const src = await readFile(join(process.cwd(), "src/components/primitives/input.tsx"), "utf8");

      expect(src).toContain("focus-visible:ring-2");
      expect(src).toContain("focus-visible:ring-focus-ring");
    });
  });

  describe("semantic table markup", () => {
    it("admin registration table uses caption and scoped headers", async () => {
      const { readFile } = await import("node:fs/promises");
      const { join } = await import("node:path");
      const src = await readFile(join(process.cwd(), "src/app/(admin)/admin/events/[slug]/registrations/page.tsx"), "utf8");

      expect(src).toContain("aria-label");
      expect(src).toContain("<caption");
      expect(src).toContain('scope="col"');
    });
  });

  describe("providers include RouteAnnouncer", () => {
    it("providers.tsx imports and renders RouteAnnouncer", async () => {
      const { readFile } = await import("node:fs/promises");
      const { join } = await import("node:path");
      const src = await readFile(join(process.cwd(), "src/app/providers.tsx"), "utf8");

      expect(src).toContain("RouteAnnouncer");
      expect(src).toContain("route-announcer");
    });
  });
});
