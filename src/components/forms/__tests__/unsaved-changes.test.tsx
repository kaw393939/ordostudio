/**
 * Sprint 46 — TDD Step 4: Unsaved-changes guard.
 *
 * - Detect dirty form state
 * - Warn before navigation via beforeunload
 * - Show <AlertDialog> for in-app route changes
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useUnsavedChangesGuard } from "@/components/forms/use-unsaved-changes-guard";
import { UnsavedChangesDialog } from "@/components/forms/unsaved-changes-dialog";

// ── Hook tests ────────────────────────────────────────────────

describe("useUnsavedChangesGuard hook", () => {
  let addSpy: ReturnType<typeof vi.spyOn>;
  let removeSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    addSpy = vi.spyOn(window, "addEventListener");
    removeSpy = vi.spyOn(window, "removeEventListener");
  });

  afterEach(() => {
    addSpy.mockRestore();
    removeSpy.mockRestore();
  });

  it("registers beforeunload listener when dirty", () => {
    renderHook(() => useUnsavedChangesGuard(true));

    const calls = addSpy.mock.calls.filter(
      ([event]) => event === "beforeunload"
    );
    expect(calls.length).toBeGreaterThanOrEqual(1);
  });

  it("does NOT register beforeunload when not dirty", () => {
    renderHook(() => useUnsavedChangesGuard(false));

    const calls = addSpy.mock.calls.filter(
      ([event]) => event === "beforeunload"
    );
    expect(calls.length).toBe(0);
  });

  it("removes listener on cleanup", () => {
    const { unmount } = renderHook(() => useUnsavedChangesGuard(true));

    unmount();

    const removes = removeSpy.mock.calls.filter(
      ([event]) => event === "beforeunload"
    );
    expect(removes.length).toBeGreaterThanOrEqual(1);
  });

  it("removes listener when dirty changes to false", () => {
    const { rerender } = renderHook(
      ({ isDirty }) => useUnsavedChangesGuard(isDirty),
      { initialProps: { isDirty: true } }
    );

    rerender({ isDirty: false });

    const removes = removeSpy.mock.calls.filter(
      ([event]) => event === "beforeunload"
    );
    expect(removes.length).toBeGreaterThanOrEqual(1);
  });
});

// ── Dialog component tests ────────────────────────────────────

describe("UnsavedChangesDialog", () => {
  it("renders nothing when not open", () => {
    render(
      <UnsavedChangesDialog
        open={false}
        onDiscard={() => {}}
        onContinueEditing={() => {}}
      />
    );

    expect(screen.queryByText("You have unsaved changes")).not.toBeInTheDocument();
  });

  it("shows warning when open", () => {
    render(
      <UnsavedChangesDialog
        open={true}
        onDiscard={() => {}}
        onContinueEditing={() => {}}
      />
    );

    expect(screen.getByText("You have unsaved changes")).toBeVisible();
    expect(screen.getByText(/Discard or continue editing/i)).toBeVisible();
  });

  it("calls onDiscard when Discard is clicked", async () => {
    const user = userEvent.setup();
    const onDiscard = vi.fn();

    render(
      <UnsavedChangesDialog
        open={true}
        onDiscard={onDiscard}
        onContinueEditing={() => {}}
      />
    );

    await user.click(screen.getByRole("button", { name: /discard/i }));
    expect(onDiscard).toHaveBeenCalledTimes(1);
  });

  it("calls onContinueEditing when Continue editing is clicked", async () => {
    const user = userEvent.setup();
    const onContinue = vi.fn();

    render(
      <UnsavedChangesDialog
        open={true}
        onDiscard={() => {}}
        onContinueEditing={onContinue}
      />
    );

    await user.click(screen.getByRole("button", { name: /continue editing/i }));
    expect(onContinue).toHaveBeenCalledTimes(1);
  });
});
