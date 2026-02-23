/**
 * Sprint 45 — TDD Step 1: cn() utility tests
 * Verifies class merging with clsx + tailwind-merge
 */
import { describe, expect, it } from "vitest";
import { cn } from "@/lib/ui/cn";

describe("cn() utility", () => {
  it("merges multiple class strings", () => {
    expect(cn("px-2", "py-3")).toBe("px-2 py-3");
  });

  it("deduplicates conflicting Tailwind classes (last wins)", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });

  it("handles conditional classes via clsx", () => {
    expect(cn("base", false && "hidden", "visible")).toBe("base visible");
  });

  it("handles undefined and null inputs gracefully", () => {
    expect(cn("base", undefined, null, "end")).toBe("base end");
  });

  it("handles empty string inputs", () => {
    expect(cn("", "base", "")).toBe("base");
  });

  it("merges object syntax from clsx", () => {
    expect(cn("base", { active: true, hidden: false })).toBe("base active");
  });

  it("resolves complex Tailwind conflicts", () => {
    // bg-red-500 should be overridden by bg-blue-500
    const result = cn("bg-red-500 text-white", "bg-blue-500");
    expect(result).toContain("bg-blue-500");
    expect(result).not.toContain("bg-red-500");
  });
});
