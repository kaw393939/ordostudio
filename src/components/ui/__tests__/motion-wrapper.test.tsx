import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import * as React from "react";

import { FadeIn, SlideUp, StaggerContainer, StaggerItem } from "@/components/ui/motion-wrapper";

describe("MotionWrapper components", () => {
  it("FadeIn renders children", () => {
    render(
      <FadeIn>
        <p>Faded in</p>
      </FadeIn>,
    );
    expect(screen.getByText("Faded in")).toBeInTheDocument();
  });

  it("SlideUp renders children", () => {
    render(
      <SlideUp>
        <p>Slid up</p>
      </SlideUp>,
    );
    expect(screen.getByText("Slid up")).toBeInTheDocument();
  });

  it("StaggerContainer + StaggerItem render children", () => {
    render(
      <StaggerContainer>
        <StaggerItem>
          <p>Item 1</p>
        </StaggerItem>
        <StaggerItem>
          <p>Item 2</p>
        </StaggerItem>
        <StaggerItem>
          <p>Item 3</p>
        </StaggerItem>
      </StaggerContainer>,
    );

    expect(screen.getByText("Item 1")).toBeInTheDocument();
    expect(screen.getByText("Item 2")).toBeInTheDocument();
    expect(screen.getByText("Item 3")).toBeInTheDocument();
  });

  it("FadeIn accepts className prop", () => {
    const { container } = render(
      <FadeIn className="custom-class">
        <p>test</p>
      </FadeIn>,
    );
    expect(container.firstElementChild).toHaveClass("custom-class");
  });
});
