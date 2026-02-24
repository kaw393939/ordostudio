import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// ── 1. EmptyState component ──
import { EmptyState } from "@/components/patterns/empty-state";

describe("EmptyState", () => {
  it("renders title, description, and optional action", () => {
    render(
      <EmptyState
        title="No upcoming events"
        description="You're all caught up!"
        action={<button type="button">Browse Events</button>}
      />,
    );
    expect(screen.getByText("No upcoming events")).toBeInTheDocument();
    expect(screen.getByText("You're all caught up!")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Browse Events" })).toBeInTheDocument();
  });

  it("uses aria-live for screen readers", () => {
    const { container } = render(
      <EmptyState title="Empty" description="Nothing here." />,
    );
    const section = container.querySelector("section");
    expect(section).toHaveAttribute("aria-live", "polite");
  });

  it("renders icon when provided", () => {
    render(
      <EmptyState
        title="No data"
        description="Nothing to show."
        icon={<span data-testid="custom-icon">★</span>}
      />,
    );
    expect(screen.getByTestId("custom-icon")).toBeInTheDocument();
  });

  it("omits icon and action when not provided", () => {
    const { container } = render(
      <EmptyState title="Empty" description="No items." />,
    );
    // Should not have the icon wrapper
    expect(container.querySelector(".size-12")).not.toBeInTheDocument();
    // Should not have an action wrapper below the description
    expect(container.querySelectorAll(".mt-4").length).toBe(0);
  });
});

// ── 2. ErrorState component ──
import { ErrorState } from "@/components/patterns/error-state";

describe("ErrorState", () => {
  it("renders with role=alert for assistive tech", () => {
    const { container } = render(
      <ErrorState description="Server error occurred." />,
    );
    expect(container.querySelector("[role='alert']")).toBeInTheDocument();
  });

  it("displays support code in collapsible details", () => {
    render(
      <ErrorState
        description="Failed."
        supportCode="abc-123"
      />,
    );
    expect(screen.getByText("Support details")).toBeInTheDocument();
    expect(screen.getByText(/abc-123/)).toBeInTheDocument();
  });

  it("uses default title when none supplied", () => {
    render(<ErrorState description="Oops." />);
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });
});

// ── 3. LoadingState component ──
import { LoadingState } from "@/components/patterns/loading-state";

describe("LoadingState", () => {
  it("renders skeleton rows matching requested count", () => {
    const { container } = render(<LoadingState rows={5} />);
    const rows = container.querySelectorAll(".animate-pulse");
    expect(rows.length).toBe(5);
  });

  it("marks section as aria-busy while loading", () => {
    const { container } = render(<LoadingState />);
    const section = container.querySelector("section");
    expect(section).toHaveAttribute("aria-busy", "true");
  });

  it("uses custom title and description", () => {
    render(
      <LoadingState title="Loading users" description="Fetching user records." />,
    );
    expect(screen.getByText("Loading users")).toBeInTheDocument();
    expect(screen.getByText("Fetching user records.")).toBeInTheDocument();
  });
});

// ── 4. ProblemRecoveryView mapping ──
import { toProblemRecoveryView } from "@/lib/problem-recovery-ui";

describe("toProblemRecoveryView (extended)", () => {
  it("maps 400 to Invalid request", () => {
    const model = toProblemRecoveryView({
      type: "about:blank",
      title: "Bad Request",
      status: 400,
      detail: "Organization name is required.",
    });
    expect(model.title).toBe("Invalid request");
    expect(model.cause).toBe("Organization name is required.");
  });

  it("maps 422 to Validation failed", () => {
    const model = toProblemRecoveryView({
      type: "about:blank",
      title: "Unprocessable Entity",
      status: 422,
    });
    expect(model.title).toBe("Validation failed");
    expect(model.cause).toContain("validation");
  });

  it("maps 409 to conflict guidance", () => {
    const model = toProblemRecoveryView({
      type: "about:blank",
      title: "Conflict",
      status: 409,
    });
    expect(model.title).toBe("This changed while you were working");
    expect(model.cause).toContain("conflict");
  });

  it("maps 429 as transient with retry", () => {
    const model = toProblemRecoveryView({
      type: "about:blank",
      title: "Too Many Requests",
      status: 429,
    });
    expect(model.transient).toBe(true);
    expect(model.actions[0].kind).toBe("retry");
  });

  it("falls back to home action for unknown status codes", () => {
    const model = toProblemRecoveryView({
      type: "about:blank",
      title: "Teapot",
      status: 418,
    });
    expect(model.title).toBe("Something went wrong");
    expect(model.actions.some((a) => a.kind === "home")).toBe(true);
  });
});

// ── 5. ProblemDetailsPanel component ──
import { ProblemDetailsPanel } from "@/components/problem-details";

describe("ProblemDetailsPanel", () => {
  it("renders user-friendly title and cause from a 404 problem", () => {
    render(
      <ProblemDetailsPanel
        problem={{
          type: "about:blank",
          title: "Not Found",
          status: 404,
          detail: "Event XYZ not found.",
        }}
      />,
    );
    expect(screen.getByText("We couldn’t find that")).toBeInTheDocument();
    expect(screen.getByText("Event XYZ not found.")).toBeInTheDocument();
    expect(screen.getByText("Browse events")).toBeInTheDocument();
    expect(screen.getByText("Go home")).toBeInTheDocument();
  });

  it("shows retry button for transient 503 errors", () => {
    render(
      <ProblemDetailsPanel
        problem={{
          type: "about:blank",
          title: "Service Unavailable",
          status: 503,
          detail: "Backend down.",
        }}
      />,
    );
    expect(screen.getByText("Temporary service issue")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });

  it("renders error list when problem.errors is populated", () => {
    render(
      <ProblemDetailsPanel
        problem={{
          type: "about:blank",
          title: "Bad Request",
          status: 400,
          detail: "Invalid input.",
          errors: ["Name is required", "Email is invalid"],
        }}
      />,
    );
    expect(screen.getByText("Name is required")).toBeInTheDocument();
    expect(screen.getByText("Email is invalid")).toBeInTheDocument();
  });

  it("shows copy support code button when request_id exists", () => {
    render(
      <ProblemDetailsPanel
        problem={{
          type: "about:blank",
          title: "Error",
          status: 500,
          detail: "Boom",
          request_id: "req-abc-123",
        }}
      />,
    );
    expect(screen.getByRole("button", { name: /copy support code/i })).toBeInTheDocument();
  });

  it("calls onRetry callback when retry button is clicked", async () => {
    const onRetry = vi.fn();
    const { default: userEvent } = await import("@testing-library/user-event");
    render(
      <ProblemDetailsPanel
        problem={{
          type: "about:blank",
          title: "Error",
          status: 503,
          detail: "Timeout",
        }}
        onRetry={onRetry}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});

// ── 6. ActionFeed uses ErrorState (not raw red div) ──
describe("ActionFeed error state consistency", () => {
  it("action-feed imports ErrorState from patterns", async () => {
    // Read the source file to verify it imports ErrorState instead of using raw red div
    const fs = await import("fs");
    const path = await import("path");
    const filePath = path.resolve(__dirname, "../../components/dashboard/action-feed.tsx");
    const source = fs.readFileSync(filePath, "utf-8");
    expect(source).toContain("ErrorState");
    expect(source).not.toContain("text-red-500 bg-red-50");
  });
});

// ── 7. Loading.tsx files existence checks ──
describe("loading.tsx route files", () => {
  const loadingPaths = [
    "@/app/(admin)/admin/events/loading",
    "@/app/(admin)/admin/users/loading",
    "@/app/(admin)/admin/intake/loading",
    "@/app/(admin)/admin/audit/loading",
    "@/app/(admin)/admin/commercial/loading",
    "@/app/(public)/account/loading",
    "@/app/(public)/login/loading",
    "@/app/(public)/register/loading",
  ];

  for (const path of loadingPaths) {
    const shortName = path.split("/").slice(-2).join("/");
    it(`${shortName} exports a default component`, async () => {
      const mod = await import(path);
      expect(mod.default).toBeDefined();
    });
  }
});
