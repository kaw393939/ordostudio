import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import AccountPage from "../page";

vi.mock("@/lib/hal-client", async () => {
  const requestHal = vi.fn(async (href: string) => {
    if (href === "/api/v1/me") {
      return {
        ok: true,
        data: {
          id: "usr_1",
          email: "user@example.com",
          status: "ACTIVE",
          roles: ["USER"],
          last_login_at: "2026-11-01T10:00:00.000Z",
          _links: {
            events: { href: "/events" },
          },
        },
      };
    }

    if (href === "/api/v1/account/attention") {
      return {
        ok: true,
        data: {
          open_actions: 3,
          overdue_actions: 2,
          pending_reminders: 1,
          badge_count: 3,
        },
      };
    }

    if (href === "/api/v1/account/activity") {
      return {
        ok: true,
        data: {
          count: 1,
          items: [
            {
              id: "audit_1",
              action: "api.auth.login",
              created_at: "2026-11-01T10:00:00.000Z",
              metadata: null,
            },
          ],
        },
      };
    }

    if (href === "/api/v1/account/registrations") {
      return {
        ok: true,
        data: {
          count: 1,
          items: [
            {
              registration_id: "reg_1",
              event_id: "evt_1",
              event_slug: "future-event",
              event_title: "Future Event",
              event_status: "PUBLISHED",
              start_at: "2026-11-10T10:00:00.000Z",
              end_at: "2026-11-10T11:00:00.000Z",
              timezone: "UTC",
              delivery_mode: "ONLINE",
              engagement_type: "INDIVIDUAL",
              location_text: null,
              meeting_url: null,
              instructor_state: "TBA",
              instructor_name: null,
              status: "REGISTERED",
              _links: {
                event: { href: "/events/future-event" },
              },
            },
          ],
        },
      };
    }

    if (href === "/api/v1/account/engagements") {
      return {
        ok: true,
        data: {
          count: 1,
          items: [
            {
              registration_id: "reg_1",
              event_slug: "future-event",
              event_title: "Future Event",
              start_at: "2026-11-10T10:00:00.000Z",
              timezone: "UTC",
              timeline_status: "UPCOMING",
              outcomes_count: 0,
              open_action_items: 3,
              blocked_action_items: 0,
              artifacts_count: 0,
              pending_reminders: 1,
              next_step: null,
              feedback_submitted: false,
            },
          ],
        },
      };
    }

    return {
      ok: false,
      problem: {
        type: "about:blank",
        title: "Not mocked",
        status: 500,
        detail: `No mock for ${href}`,
      },
    };
  });

  return {
    requestHal,
  };
});

describe("Account dashboard tabs", () => {
  it("renders tabs and shows correct overview counts", async () => {
    render(<AccountPage />);

    expect(await screen.findByRole("tab", { name: "Overview" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /My Registrations/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Follow-Ups/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Feedback/i })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByLabelText("Upcoming events count")).toHaveTextContent("1");
      expect(screen.getByLabelText("Open actions count")).toHaveTextContent("3");
      expect(screen.getByLabelText("Overdue items count")).toHaveTextContent("2");
    });

    // Follow-ups trigger includes attention badge (overdue + pending reminders)
    const followUpsTab = screen.getByRole("tab", { name: /Follow-Ups/i });
    expect(within(followUpsTab).getByText("3")).toBeInTheDocument();
  });

  it("switches to registrations tab and renders registration rows", async () => {
    const user = userEvent.setup();
    render(<AccountPage />);

    await screen.findByRole("tab", { name: "Overview" });

    await user.click(screen.getByRole("tab", { name: /My Registrations/i }));
    expect(await screen.findByText("Future Event")).toBeInTheDocument();
    expect(screen.getByText("future-event")).toBeInTheDocument();
  });
});
