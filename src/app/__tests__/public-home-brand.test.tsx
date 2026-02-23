import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import Home, { metadata } from "../(public)/page";

describe("public home brand", () => {
  it("renders primary CTAs", () => {
    render(<Home />);

    expect(screen.getByRole("link", { name: "View training tracks" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Book a technical consult" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Join the studio" })).toBeInTheDocument();
  });

  it("exports Studio Ordo metadata", () => {
    expect(metadata.title).toContain("Studio Ordo");
    expect(metadata.alternates?.canonical).toBe("/");
  });
});
