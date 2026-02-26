import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import Home, { metadata } from "../(public)/page";

describe("public home brand", () => {
  it("renders the homepage main content area", () => {
    render(<Home />);

    // Homepage is now a full-screen chat UI — verify the primary content area
    const main = document.getElementById("main-content");
    expect(main).toBeInTheDocument();
  });

  it("exports Studio Ordo metadata", () => {
    const title = typeof metadata.title === "object" && metadata.title !== null && "absolute" in metadata.title
      ? metadata.title.absolute
      : String(metadata.title ?? "");
    expect(title).toContain("Studio Ordo");
    expect(metadata.alternates?.canonical).toBe("/");
  });
});
