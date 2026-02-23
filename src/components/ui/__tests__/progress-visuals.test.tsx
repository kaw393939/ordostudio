import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import * as React from "react";

import { ProgressBar } from "@/components/ui/progress-bar";
import { ProgressRing } from "@/components/ui/progress-ring";

describe("Sprint 49: progress visuals", () => {
  it("ProgressBar renders ARIA and clamps value", () => {
    const { container, rerender } = render(<ProgressBar value={50} label="Overall" />);
    const bar = screen.getByRole("progressbar", { name: "Overall" });
    expect(bar).toHaveAttribute("aria-valuenow", "50");

    const fill = container.querySelector("[role='progressbar'] > div");
    expect(fill).not.toBeNull();
    expect(fill).toHaveStyle({ width: "50%" });

    rerender(<ProgressBar value={150} label="Overall" />);
    expect(screen.getByRole("progressbar", { name: "Overall" })).toHaveAttribute("aria-valuenow", "100");
  });

  it("ProgressRing renders ARIA and uses dashoffset", () => {
    const { container } = render(<ProgressRing value={25} label="Engagement" />);
    const ring = screen.getByRole("progressbar", { name: "Engagement" });
    expect(ring).toHaveAttribute("aria-valuenow", "25");

    const circles = container.querySelectorAll("svg circle");
    expect(circles.length).toBeGreaterThanOrEqual(2);

    const progressCircle = circles[1];
    const raw = progressCircle.getAttribute("stroke-dashoffset");
    expect(raw).toBeTruthy();

    const dashOffset = Number(raw);
    const size = 44;
    const strokeWidth = 6;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const expected = circumference * (1 - 0.25);

    expect(dashOffset).toBeGreaterThan(0);
    expect(Math.abs(dashOffset - expected)).toBeLessThan(0.01);
  });
});
