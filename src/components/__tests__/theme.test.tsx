/**
 * Sprint 45 — TDD Step 3: ThemeProvider + ThemeToggle tests
 * Dark-mode toggle state management and persistence.
 */
import { describe, expect, it, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import * as React from "react";

import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";

describe("ThemeProvider", () => {
  it("renders children inside the provider", () => {
    render(
      <ThemeProvider>
        <p>Hello Theme</p>
      </ThemeProvider>,
    );
    expect(screen.getByText("Hello Theme")).toBeInTheDocument();
  });
});

describe("ThemeToggle", () => {
  beforeEach(() => {
    // Reset document classes between tests
    document.documentElement.classList.remove("dark", "light");
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.style.colorScheme = "";
  });

  it("renders a toggle button with accessible label", () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    );
    const btn = screen.getByRole("button", { name: /toggle theme/i });
    expect(btn).toBeInTheDocument();
  });

  it("displays sun and moon icons", () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    );
    // The toggle should contain SVG icons (Sun and Moon from Lucide)
    const btn = screen.getByRole("button", { name: /toggle theme/i });
    const svgs = btn.querySelectorAll("svg");
    expect(svgs.length).toBeGreaterThanOrEqual(1);
  });
});
