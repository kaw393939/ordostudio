/**
 * Sprint 46 — TDD Step 3: Submit-state machine.
 *
 * idle → submitting (disabled + spinner) → success | error
 * Double-submit prevention.
 */
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { useSubmitState, type SubmitState } from "@/components/forms/use-submit-state";
import { SubmitButton } from "@/components/forms/submit-button";
import { useForm, FormProvider } from "react-hook-form";

// ── Test wrapper to exercise the hook ──

function TestHarness({
  handler,
  renderState,
}: {
  handler: () => Promise<void>;
  renderState?: (state: SubmitState) => React.ReactNode;
}) {
  const { state, handleSubmit, reset } = useSubmitState(handler);

  return (
    <div>
      <span data-testid="state">{state}</span>
      <button onClick={() => void handleSubmit()}>Go</button>
      <button onClick={reset}>Reset</button>
      {renderState?.(state)}
    </div>
  );
}

describe("useSubmitState hook", () => {
  it("starts in idle state", () => {
    render(<TestHarness handler={() => Promise.resolve()} />);
    expect(screen.getByTestId("state").textContent).toBe("idle");
  });

  it("transitions idle → submitting → success", async () => {
    const user = userEvent.setup();
    let resolve: () => void;
    const handler = () => new Promise<void>((r) => { resolve = r; });

    render(<TestHarness handler={handler} />);

    await user.click(screen.getByText("Go"));
    expect(screen.getByTestId("state").textContent).toBe("submitting");

    await act(async () => resolve!());
    await waitFor(() => {
      expect(screen.getByTestId("state").textContent).toBe("success");
    });
  });

  it("transitions idle → submitting → error on rejection", async () => {
    const user = userEvent.setup();
    let reject: (err: Error) => void;
    const handler = () => new Promise<void>((_, r) => { reject = r; });

    render(<TestHarness handler={handler} />);

    await user.click(screen.getByText("Go"));
    expect(screen.getByTestId("state").textContent).toBe("submitting");

    await act(async () => reject!(new Error("boom")));
    await waitFor(() => {
      expect(screen.getByTestId("state").textContent).toBe("error");
    });
  });

  it("prevents double-submit while submitting", async () => {
    const user = userEvent.setup();
    const handler = vi.fn(() => new Promise<void>(() => {})); // never resolves

    render(<TestHarness handler={handler} />);

    await user.click(screen.getByText("Go"));
    await user.click(screen.getByText("Go"));
    await user.click(screen.getByText("Go"));

    // handler called only once
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("reset returns to idle", async () => {
    const user = userEvent.setup();
    const handler = () => Promise.resolve();

    render(<TestHarness handler={handler} />);

    await user.click(screen.getByText("Go"));
    await waitFor(() => {
      expect(screen.getByTestId("state").textContent).toBe("success");
    });

    await user.click(screen.getByText("Reset"));
    expect(screen.getByTestId("state").textContent).toBe("idle");
  });
});

describe("SubmitButton component", () => {
  function Wrapper({
    state,
    children,
  }: {
    state: SubmitState;
    children?: string;
  }) {
    const form = useForm({ defaultValues: {} });
    return (
      <FormProvider {...form}>
        <form>
          <SubmitButton state={state}>{children ?? "Save"}</SubmitButton>
        </form>
      </FormProvider>
    );
  }

  it("shows children text in idle state", () => {
    render(<Wrapper state="idle">Save changes</Wrapper>);
    expect(screen.getByRole("button", { name: "Save changes" })).toBeEnabled();
  });

  it("shows loading indicator and is disabled when submitting", () => {
    render(<Wrapper state="submitting">Save</Wrapper>);
    const btn = screen.getByRole("button");
    expect(btn).toBeDisabled();
    expect(btn.textContent).toContain("Saving");
  });

  it("shows success text briefly after success", () => {
    render(<Wrapper state="success">Save</Wrapper>);
    const btn = screen.getByRole("button");
    expect(btn.textContent).toContain("Saved");
  });

  it("returns to normal in error state", () => {
    render(<Wrapper state="error">Save</Wrapper>);
    const btn = screen.getByRole("button");
    expect(btn).toBeEnabled();
    expect(btn.textContent).toContain("Save");
  });
});
