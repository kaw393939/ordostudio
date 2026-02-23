import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import * as React from "react";

const motionDivSpy = vi.fn((props: React.HTMLAttributes<HTMLDivElement>) => <div {...props} />);

vi.mock("framer-motion", async () => {
  return {
    motion: {
      div: motionDivSpy,
    },
    useReducedMotion: () => true,
  };
});

describe("reduced motion wrappers", () => {
  it("renders without calling motion.div when reduced motion is enabled", async () => {
    const { FadeIn, SlideUp, StaggerContainer, StaggerItem } = await import("@/components/ui/motion-wrapper");

    render(
      <div>
        <FadeIn>
          <p>Fade</p>
        </FadeIn>
        <SlideUp>
          <p>Slide</p>
        </SlideUp>
        <StaggerContainer>
          <StaggerItem>
            <p>Item</p>
          </StaggerItem>
        </StaggerContainer>
      </div>,
    );

    expect(screen.getByText("Fade")).toBeInTheDocument();
    expect(screen.getByText("Slide")).toBeInTheDocument();
    expect(screen.getByText("Item")).toBeInTheDocument();

    expect(motionDivSpy).not.toHaveBeenCalled();
  });
});
