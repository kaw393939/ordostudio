import { describe, expect, it } from "vitest";
import {
  fadeIn,
  slideUp,
  scaleIn,
  staggerChildren,
  MOTION_DURATION,
} from "@/lib/ui/motion";

describe("animation variants", () => {
  it("exports fadeIn with initial and animate states", () => {
    expect(fadeIn).toHaveProperty("initial");
    expect(fadeIn).toHaveProperty("animate");
    expect(fadeIn.initial).toHaveProperty("opacity", 0);
    expect(fadeIn.animate).toHaveProperty("opacity", 1);
  });

  it("exports slideUp with y offset in initial state", () => {
    expect(slideUp).toHaveProperty("initial");
    expect(slideUp).toHaveProperty("animate");
    expect(slideUp.initial).toHaveProperty("y");
    expect((slideUp.initial as { y: number }).y).toBeGreaterThan(0);
    expect(slideUp.animate).toHaveProperty("y", 0);
  });

  it("exports scaleIn with scaled-down initial state", () => {
    expect(scaleIn).toHaveProperty("initial");
    expect(scaleIn).toHaveProperty("animate");
    expect((scaleIn.initial as { scale: number }).scale).toBeLessThan(1);
    expect(scaleIn.animate).toHaveProperty("scale", 1);
  });

  it("exports staggerChildren for orchestrating child animations", () => {
    expect(staggerChildren).toHaveProperty("animate");
    const animate = staggerChildren.animate as { transition?: { staggerChildren?: number } };
    expect(animate.transition).toHaveProperty("staggerChildren");
    expect(animate.transition!.staggerChildren).toBeGreaterThan(0);
  });

  it("exports consistent base duration constant", () => {
    expect(typeof MOTION_DURATION).toBe("number");
    expect(MOTION_DURATION).toBeGreaterThan(0);
    expect(MOTION_DURATION).toBeLessThanOrEqual(0.5);
  });
});
