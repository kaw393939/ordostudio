import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import * as React from "react";

import { Countdown } from "@/components/ui/countdown";

describe("Countdown", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows days/hours/minutes remaining", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-19T12:00:00.000Z"));

    render(
      <Countdown
        deadlineIso="2026-02-26T14:30:00.000Z"
        updateIntervalMs={60_000}
      />,
    );

    expect(screen.getByText("7d 2h 30m")).toBeInTheDocument();
  });

  it("renders 'Registration closed' when expired", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-19T12:00:00.000Z"));

    render(
      <Countdown
        deadlineIso="2026-02-19T11:59:00.000Z"
        updateIntervalMs={60_000}
      />,
    );

    expect(screen.getByText(/registration closed/i)).toBeInTheDocument();
  });

  it("pulses when under one hour remaining", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-19T12:00:00.000Z"));

    const { container } = render(
      <Countdown
        deadlineIso="2026-02-19T12:59:00.000Z"
        updateIntervalMs={60_000}
      />,
    );

    expect(container.firstElementChild).toHaveClass("animate-pulse");
  });

  it("updates as time advances", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-19T12:00:00.000Z"));

    render(
      <Countdown
        deadlineIso="2026-02-19T13:30:00.000Z"
        updateIntervalMs={60_000}
      />,
    );

    expect(screen.getByText("0d 1h 30m")).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });
    expect(screen.getByText("0d 1h 29m")).toBeInTheDocument();
  });
});
