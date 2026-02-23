import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams("offer=workshop"),
}));

const requestHal = vi.fn();
vi.mock("@/lib/hal-client", () => ({
  requestHal: (...args: unknown[]) => requestHal(...args),
}));

import ServiceRequestPage from "../(public)/services/request/page";

describe("consult request form", () => {
  it("shows adjacent validation errors and does not submit when required fields are missing", () => {
    render(<ServiceRequestPage />);

    fireEvent.click(screen.getByRole("button", { name: "Submit request" }));

    expect(screen.getByText("Contact name is required.")).toBeInTheDocument();
    expect(screen.getByText("Enter a valid email address.")).toBeInTheDocument();
    expect(screen.getByText("Goals are required.")).toBeInTheDocument();

    expect(requestHal).not.toHaveBeenCalled();
  });
});
