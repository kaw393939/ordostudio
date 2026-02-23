/**
 * Sprint 46 — TDD Step 8: Rich input enhancements.
 *
 * - Character count with approaching-limit warning
 * - Password show/hide toggle
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { CharacterCount } from "@/components/forms/character-count";
import { PasswordInput } from "@/components/forms/password-input";

// ── Character count ──────────────────────────────────────

describe("CharacterCount", () => {
  it("displays current count and max", () => {
    render(<CharacterCount value="hello" maxLength={100} />);
    expect(screen.getByText("5 / 100")).toBeInTheDocument();
  });

  it("displays 0 for empty value", () => {
    render(<CharacterCount value="" maxLength={200} />);
    expect(screen.getByText("0 / 200")).toBeInTheDocument();
  });

  it("applies warning style when approaching limit (≥ 90%)", () => {
    const { container } = render(<CharacterCount value={"x".repeat(91)} maxLength={100} />);
    const el = container.querySelector("[data-warning]");
    expect(el?.getAttribute("data-warning")).toBe("true");
  });

  it("does not apply warning when below threshold", () => {
    const { container } = render(<CharacterCount value={"x".repeat(50)} maxLength={100} />);
    const el = container.querySelector("[data-warning]");
    expect(el?.getAttribute("data-warning")).toBe("false");
  });

  it("applies over-limit style when exceeding max", () => {
    const { container } = render(<CharacterCount value={"x".repeat(105)} maxLength={100} />);
    const el = container.querySelector("[data-overlimit]");
    expect(el?.getAttribute("data-overlimit")).toBe("true");
  });
});

// ── Password input ───────────────────────────────────────

describe("PasswordInput", () => {
  it("renders as password type by default", () => {
    render(<PasswordInput aria-label="Password" />);
    const input = screen.getByLabelText("Password") as HTMLInputElement;
    expect(input.type).toBe("password");
  });

  it("toggles to text type when show button is clicked", async () => {
    const user = userEvent.setup();
    render(<PasswordInput aria-label="Password" />);

    const toggle = screen.getByRole("button", { name: /show password/i });
    await user.click(toggle);

    const input = screen.getByLabelText("Password") as HTMLInputElement;
    expect(input.type).toBe("text");
  });

  it("toggles back to password type on second click", async () => {
    const user = userEvent.setup();
    render(<PasswordInput aria-label="Password" />);

    const toggle = screen.getByRole("button", { name: /show password/i });
    await user.click(toggle);
    await user.click(screen.getByRole("button", { name: /hide password/i }));

    const input = screen.getByLabelText("Password") as HTMLInputElement;
    expect(input.type).toBe("password");
  });

  it("passes through standard input props", async () => {
    const user = userEvent.setup();
    render(<PasswordInput aria-label="Password" placeholder="Enter password" />);

    const input = screen.getByLabelText("Password") as HTMLInputElement;
    expect(input.placeholder).toBe("Enter password");

    await user.type(input, "secret123");
    expect(input.value).toBe("secret123");
  });
});
