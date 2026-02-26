import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import TrainingPage, { metadata } from "../(public)/services/page";

describe("training landing", () => {
  it("renders the three training offers", () => {
    render(<TrainingPage />);

    expect(screen.getByRole("heading", { name: "Workshop" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Team program" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Advisory / enablement" })).toBeInTheDocument();

    expect(screen.getAllByRole("link", { name: "View details" })).toHaveLength(3);
    expect(screen.getAllByRole("link", { name: "Book a technical consult" })).toHaveLength(3);
  });

  it("exports Training metadata", () => {
    expect(metadata.alternates?.canonical).toBe("/services");
    expect(metadata.title).toBe("Training");
  });
});
