import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";

import { AsyncBoundary } from "@/components/patterns/async-boundary";

describe("AsyncBoundary", () => {
  it("shows loading state while data is being fetched", () => {
    render(
      <AsyncBoundary
        isLoading={true}
        error={null}
        data={null}
        renderData={() => <p>Data</p>}
      />,
    );
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
    expect(screen.queryByText("Data")).not.toBeInTheDocument();
  });

  it("shows error state with retry button when error is provided", async () => {
    const onRetry = vi.fn();
    render(
      <AsyncBoundary
        isLoading={false}
        error="Network timeout occurred"
        data={null}
        onRetry={onRetry}
        renderData={() => <p>Data</p>}
      />,
    );
    expect(screen.getByRole("heading", { name: /something went wrong/i })).toBeInTheDocument();
    expect(screen.getByText("Network timeout occurred")).toBeInTheDocument();
    expect(screen.queryByText("Data")).not.toBeInTheDocument();

    const retryBtn = screen.getByRole("button", { name: /retry/i });
    await userEvent.click(retryBtn);
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("shows empty state when data is empty array", () => {
    render(
      <AsyncBoundary
        isLoading={false}
        error={null}
        data={[]}
        emptyTitle="No items"
        emptyDescription="Nothing here yet."
        renderData={(data) => <p>Count: {data.length}</p>}
      />,
    );
    expect(screen.getByText("No items")).toBeInTheDocument();
    expect(screen.getByText("Nothing here yet.")).toBeInTheDocument();
    expect(screen.queryByText(/count/i)).not.toBeInTheDocument();
  });

  it("shows empty state when data is null (after loading)", () => {
    render(
      <AsyncBoundary
        isLoading={false}
        error={null}
        data={null}
        emptyTitle="No results"
        emptyDescription="Try a different search."
        renderData={() => <p>Data</p>}
      />,
    );
    expect(screen.getByText("No results")).toBeInTheDocument();
  });

  it("renders data when present", () => {
    render(
      <AsyncBoundary
        isLoading={false}
        error={null}
        data={[{ id: 1, name: "Alice" }]}
        renderData={(data) => (
          <ul>
            {data.map((d: { id: number; name: string }) => (
              <li key={d.id}>{d.name}</li>
            ))}
          </ul>
        )}
      />,
    );
    expect(screen.getByText("Alice")).toBeInTheDocument();
  });

  it("prioritizes loading over error and data", () => {
    render(
      <AsyncBoundary
        isLoading={true}
        error="Some error"
        data={[{ id: 1 }]}
        renderData={() => <p>Data</p>}
      />,
    );
    expect(screen.getByRole("heading", { name: /loading/i })).toBeInTheDocument();
    expect(screen.queryByText("Data")).not.toBeInTheDocument();
    expect(screen.queryByText("Some error")).not.toBeInTheDocument();
  });

  it("prioritizes error over empty/data", () => {
    render(
      <AsyncBoundary
        isLoading={false}
        error="Fetch failed"
        data={[]}
        renderData={() => <p>Data</p>}
      />,
    );
    expect(screen.getByText(/fetch failed/i)).toBeInTheDocument();
    expect(screen.queryByText("Data")).not.toBeInTheDocument();
  });

  it("uses custom loading rows count", () => {
    const { container } = render(
      <AsyncBoundary
        isLoading={true}
        error={null}
        data={null}
        loadingRows={5}
        renderData={() => <p>Data</p>}
      />,
    );
    const skeletons = container.querySelectorAll("[data-slot='skeleton']");
    expect(skeletons.length).toBe(5);
  });

  it("supports custom empty action element", () => {
    render(
      <AsyncBoundary
        isLoading={false}
        error={null}
        data={[]}
        emptyTitle="No events"
        emptyDescription="Create your first event."
        emptyAction={<button type="button">Create Event</button>}
        renderData={() => <p>Data</p>}
      />,
    );
    expect(screen.getByRole("button", { name: "Create Event" })).toBeInTheDocument();
  });
});
