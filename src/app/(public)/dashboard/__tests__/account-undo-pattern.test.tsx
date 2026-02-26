/**
 * Dashboard page – render & interaction tests.
 *
 * Covers the current ActionFeed-based dashboard:
 *   - Loading user profile and rendering the feed
 *   - Empty state when there are no feed items
 *   - Error state when /api/v1/me fails
 *   - Feed cards rendered for different item types
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import AccountPage from "../page";

/* ── mock setup ───────────────────────────────────────── */

const mocks = vi.hoisted(() => {
  const requestHal = vi.fn();

  return { requestHal };
});

vi.mock("@/lib/hal-client", () => ({
  requestHal: mocks.requestHal,
}));

const requestHal = mocks.requestHal;

/* ── helpers ──────────────────────────────────────────── */

function mockMeOk(roles: string[] = ["USER"]) {
  return {
    ok: true,
    data: {
      id: "usr_1",
      email: "user@example.com",
      status: "ACTIVE",
      roles,
      last_login_at: "2026-11-01T10:00:00.000Z",
      _links: { events: { href: "/events" } },
    },
  };
}

function mockFeedItems(items: Array<{ id: string; type: string; title: string; description: string; timestamp: string; actionUrl?: string }>) {
  return {
    ok: true,
    data: { count: items.length, items, hasMore: false },
  };
}

const EMPTY_FEED = mockFeedItems([]);

/* ── tests ────────────────────────────────────────────── */

describe("Dashboard page", () => {
  beforeEach(() => {
    requestHal.mockReset();
  });

  it("shows empty state when feed has no items", async () => {
    requestHal.mockImplementation(async (href: string) => {
      if (href === "/api/v1/me") return mockMeOk();
      if (href.startsWith("/api/v1/me/feed")) return EMPTY_FEED;
      return { ok: true, data: {} };
    });

    render(<AccountPage />);

    expect(
      await screen.findByText("No upcoming events or actions required."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("You're all caught up! Check back later for new updates."),
    ).toBeInTheDocument();
  });

  it("renders upcoming event cards from feed", async () => {
    requestHal.mockImplementation(async (href: string) => {
      if (href === "/api/v1/me") return mockMeOk();
      if (href.startsWith("/api/v1/me/feed"))
        return mockFeedItems([
          {
            id: "reg-1",
            type: "AccountRegistration",
            title: "Future Event",
            description: "Starts Nov 10",
            timestamp: "2026-11-10T10:00:00.000Z",
            actionUrl: "/events/future-event",
          },
        ]);
      return { ok: true, data: {} };
    });

    render(<AccountPage />);

    expect(await screen.findByText("Future Event")).toBeInTheDocument();
    expect(screen.getByText("Upcoming Event")).toBeInTheDocument();
    expect(screen.getByText("View Details")).toBeInTheDocument();
  });

  it("renders action-required cards for follow-up actions", async () => {
    requestHal.mockImplementation(async (href: string) => {
      if (href === "/api/v1/me") return mockMeOk();
      if (href.startsWith("/api/v1/me/feed"))
        return mockFeedItems([
          {
            id: "action-1",
            type: "FollowUpAction",
            title: "Send the summary email",
            description: "Overdue follow-up",
            timestamp: "2026-11-05T10:00:00.000Z",
            actionUrl: "/events/future-event",
          },
        ]);
      return { ok: true, data: {} };
    });

    render(<AccountPage />);

    expect(await screen.findByText("Send the summary email")).toBeInTheDocument();
    expect(screen.getByText("Action Required")).toBeInTheDocument();
    expect(screen.getByText("Complete Action")).toBeInTheDocument();
  });

  it("shows problem panel when /api/v1/me returns an error", async () => {
    requestHal.mockImplementation(async (href: string) => {
      if (href === "/api/v1/me")
        return {
          ok: false,
          problem: {
            type: "about:blank",
            title: "Unauthorized",
            status: 401,
            detail: "Active session required.",
          },
        };
      return { ok: true, data: {} };
    });

    render(<AccountPage />);

    expect(await screen.findByText("Sign in required")).toBeInTheDocument();
    const loginLinks = screen.getAllByText(/Go to login/i);
    expect(loginLinks.length).toBeGreaterThanOrEqual(1);
  });

  it("fetches /api/v1/me and /api/v1/me/feed on mount", async () => {
    requestHal.mockImplementation(async (href: string) => {
      if (href === "/api/v1/me") return mockMeOk();
      if (href.startsWith("/api/v1/me/feed")) return EMPTY_FEED;
      return { ok: true, data: {} };
    });

    render(<AccountPage />);

    await screen.findByText("No upcoming events or actions required.");

    expect(requestHal).toHaveBeenCalledWith("/api/v1/me");
    expect(requestHal).toHaveBeenCalledWith("/api/v1/me/feed?page=1&limit=10");
  });

  it("shows correct subtitle for operator users", async () => {
    requestHal.mockImplementation(async (href: string) => {
      if (href === "/api/v1/me") return mockMeOk(["USER", "ADMIN"]);
      if (href.startsWith("/api/v1/me/feed")) return EMPTY_FEED;
      return { ok: true, data: {} };
    });

    render(<AccountPage />);

    expect(await screen.findByText("Your operator cockpit.")).toBeInTheDocument();
  });
});
