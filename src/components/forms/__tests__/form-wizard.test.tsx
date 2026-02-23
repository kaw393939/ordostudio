/**
 * Sprint 46 — TDD Step 6: Multi-step form wizard.
 *
 * - Step indicator showing current step
 * - Back/next/submit navigation
 * - Per-step validation
 * - Session storage persistence
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { FormWizard, type WizardStep } from "@/components/forms/form-wizard";

// ── Test steps ───────────────────────────────────

const steps: WizardStep[] = [
  {
    id: "contact",
    label: "Contact Info",
    content: (
      <div>
        <label htmlFor="wiz-name">Name</label>
        <input id="wiz-name" data-testid="name-input" />
      </div>
    ),
    validate: async () => true,
  },
  {
    id: "details",
    label: "Details",
    content: (
      <div>
        <label htmlFor="wiz-detail">Detail</label>
        <input id="wiz-detail" data-testid="detail-input" />
      </div>
    ),
    validate: async () => true,
  },
  {
    id: "review",
    label: "Review",
    content: <div data-testid="review-step">Review your info</div>,
    validate: async () => true,
  },
];

describe("FormWizard", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("shows the first step by default", () => {
    render(<FormWizard steps={steps} storageKey="test-wizard" onComplete={() => {}} />);

    expect(screen.getByTestId("name-input")).toBeInTheDocument();
    expect(screen.queryByTestId("detail-input")).not.toBeInTheDocument();
  });

  it("shows step indicator with all step labels", () => {
    render(<FormWizard steps={steps} storageKey="test-wizard" onComplete={() => {}} />);

    expect(screen.getByText("Contact Info")).toBeInTheDocument();
    expect(screen.getByText("Details")).toBeInTheDocument();
    expect(screen.getByText("Review")).toBeInTheDocument();
  });

  it("highlights the current step in the indicator", () => {
    render(<FormWizard steps={steps} storageKey="test-wizard" onComplete={() => {}} />);

    const step1 = screen.getByText("Contact Info");
    expect(step1.closest("[data-active]")?.getAttribute("data-active")).toBe("true");
  });

  it("navigates to next step when Next is clicked", async () => {
    const user = userEvent.setup();
    render(<FormWizard steps={steps} storageKey="test-wizard" onComplete={() => {}} />);

    await user.click(screen.getByRole("button", { name: /next/i }));

    await waitFor(() => {
      expect(screen.getByTestId("detail-input")).toBeInTheDocument();
      expect(screen.queryByTestId("name-input")).not.toBeInTheDocument();
    });
  });

  it("navigates back when Back is clicked", async () => {
    const user = userEvent.setup();
    render(<FormWizard steps={steps} storageKey="test-wizard" onComplete={() => {}} />);

    await user.click(screen.getByRole("button", { name: /next/i }));
    await waitFor(() => {
      expect(screen.getByTestId("detail-input")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /back/i }));
    await waitFor(() => {
      expect(screen.getByTestId("name-input")).toBeInTheDocument();
    });
  });

  it("Back button is hidden on the first step", () => {
    render(<FormWizard steps={steps} storageKey="test-wizard" onComplete={() => {}} />);

    expect(screen.queryByRole("button", { name: /back/i })).not.toBeInTheDocument();
  });

  it("shows Submit button on the last step instead of Next", async () => {
    const user = userEvent.setup();
    render(<FormWizard steps={steps} storageKey="test-wizard" onComplete={() => {}} />);

    await user.click(screen.getByRole("button", { name: /next/i }));
    await waitFor(() => expect(screen.getByTestId("detail-input")).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: /next/i }));
    await waitFor(() => expect(screen.getByTestId("review-step")).toBeInTheDocument());

    expect(screen.getByRole("button", { name: /submit/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /next/i })).not.toBeInTheDocument();
  });

  it("calls onComplete when Submit is clicked on last step", async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    render(<FormWizard steps={steps} storageKey="test-wizard" onComplete={onComplete} />);

    // Navigate to last step
    await user.click(screen.getByRole("button", { name: /next/i }));
    await waitFor(() => expect(screen.getByTestId("detail-input")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: /next/i }));
    await waitFor(() => expect(screen.getByTestId("review-step")).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: /submit/i }));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("blocks navigation to next step if validation fails", async () => {
    const user = userEvent.setup();
    const failingSteps = [
      { ...steps[0], validate: async () => false },
      steps[1],
      steps[2],
    ];

    render(<FormWizard steps={failingSteps} storageKey="test-wizard" onComplete={() => {}} />);

    await user.click(screen.getByRole("button", { name: /next/i }));

    // Should stay on step 1
    await waitFor(() => {
      expect(screen.getByTestId("name-input")).toBeInTheDocument();
      expect(screen.queryByTestId("detail-input")).not.toBeInTheDocument();
    });
  });

  it("persists current step to session storage", async () => {
    const user = userEvent.setup();
    render(<FormWizard steps={steps} storageKey="test-wizard" onComplete={() => {}} />);

    await user.click(screen.getByRole("button", { name: /next/i }));
    await waitFor(() => expect(screen.getByTestId("detail-input")).toBeInTheDocument());

    const raw = sessionStorage.getItem("test-wizard");
    expect(raw).toBeDefined();
    const stored = JSON.parse(raw!);
    expect(stored.currentStep).toBe(1);
  });

  it("restores step from session storage on mount", () => {
    sessionStorage.setItem("test-wizard", JSON.stringify({ currentStep: 2 }));

    render(<FormWizard steps={steps} storageKey="test-wizard" onComplete={() => {}} />);

    expect(screen.getByTestId("review-step")).toBeInTheDocument();
  });
});
