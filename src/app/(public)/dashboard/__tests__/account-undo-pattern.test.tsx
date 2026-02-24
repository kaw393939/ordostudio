import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import AccountPage from "../page";

const mocks = vi.hoisted(() => {
  const requestHal = vi.fn(async (href: string, init?: { method?: string; body?: string }) => {
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

    if (href === "/api/v1/me/feed?page=1&limit=10") {
      return {
        ok: true,
        data: {
          count: 0,
          items: [],
        },
      };
    }

    if (href === "/api/v1/account/attention") {
      return {
        ok: true,
        data: {
          open_actions: 1,
          overdue_actions: 0,
          pending_reminders: 1,
          badge_count: 1,
        },
      };
    }

    if (href === "/api/v1/account/activity") {
      return {
        ok: true,
        data: {
          count: 0,
          items: [],
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
                "app:cancel": { href: "/api/v1/events/future-event/registrations/usr_1" },
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
              open_action_items: 1,
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

    if (href === "/api/v1/account/engagements/future-event/follow-up") {
      return {
        ok: true,
        data: {
          actions_count: 1,
          reminders_count: 1,
          actions: [
            {
              id: "act_1",
              description: "Send the summary email",
              status: "OPEN",
              due_at: "2026-11-05T10:00:00.000Z",
              owner_user_id: "usr_1",
            },
          ],
          reminders: [
            {
              id: "rem_1",
              action_item_id: "act_1",
              reminder_type: "UPCOMING",
              reminder_for: "2026-11-04T10:00:00.000Z",
              status: "PENDING",
            },
          ],
        },
      };
    }

    if (href === "/api/v1/account/engagements/future-event/reminders/rem_1" && init?.method === "PATCH") {
      return { ok: true, data: { acknowledged: true } };
    }

    if (href === "/api/v1/account/engagements/future-event/actions/act_1" && init?.method === "PATCH") {
      return { ok: true, data: { id: "act_1", status: "DONE" } };
    }

    if (href === "/api/v1/events/future-event/registrations/usr_1" && init?.method === "DELETE") {
      return { ok: true, data: { status: "CANCELLED" } };
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
    toastSuccess: vi.fn(() => "toast-id"),
    toastError: vi.fn(() => "toast-error-id"),
    toastDismiss: vi.fn(),
    requestHal,
  };
});

vi.mock("sonner", () => {
  return {
    toast: {
      success: mocks.toastSuccess,
      error: mocks.toastError,
      dismiss: mocks.toastDismiss,
    },
  };
});

vi.mock("@/lib/hal-client", async () => {
  return {
    requestHal: mocks.requestHal,
  };
});

const requestHal = mocks.requestHal;

const toastSuccess = mocks.toastSuccess;
const toastError = mocks.toastError;
const toastDismiss = mocks.toastDismiss;

describe("Account undo pattern", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_FF_UNDO_DELETE = "true";
    toastSuccess.mockClear();
    toastError.mockClear();
    toastDismiss.mockClear();
    requestHal.mockClear();
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_FF_UNDO_DELETE;
    vi.useRealTimers();
  });

  it("delays reminder dismissal PATCH until 8 seconds elapse", async () => {
    const user = userEvent.setup();
    render(<AccountPage />);

    await screen.findByRole("tab", { name: /Follow-Ups/i });
    await user.click(screen.getByRole("tab", { name: /Follow-Ups/i }));

    const acknowledge = await screen.findByRole("button", { name: "Acknowledge" });

    vi.useFakeTimers();
    fireEvent.click(acknowledge);

    expect(requestHal).not.toHaveBeenCalledWith(
      "/api/v1/account/engagements/future-event/reminders/rem_1",
      expect.objectContaining({ method: "PATCH" }),
    );

    vi.advanceTimersByTime(8000);
    await Promise.resolve();

    expect(requestHal).toHaveBeenCalledWith(
      "/api/v1/account/engagements/future-event/reminders/rem_1",
      expect.objectContaining({ method: "PATCH" }),
    );
  });

  it("cancels reminder dismissal when Undo is clicked", async () => {
    const user = userEvent.setup();
    render(<AccountPage />);

    await screen.findByRole("tab", { name: /Follow-Ups/i });
    await user.click(screen.getByRole("tab", { name: /Follow-Ups/i }));

    const acknowledge = await screen.findByRole("button", { name: "Acknowledge" });

    vi.useFakeTimers();
    fireEvent.click(acknowledge);

    const lastToastArgs = toastSuccess.mock.calls.at(-1);
    expect(lastToastArgs?.[0]).toBe("Reminder dismissed.");
    const options = lastToastArgs?.[1] as { action?: { onClick?: () => void } } | undefined;
    expect(options?.action?.onClick).toBeTypeOf("function");

    options?.action?.onClick?.();

    vi.advanceTimersByTime(8000);
    await Promise.resolve();

    expect(requestHal).not.toHaveBeenCalledWith(
      "/api/v1/account/engagements/future-event/reminders/rem_1",
      expect.objectContaining({ method: "PATCH" }),
    );
  });

  it("delays follow-up Mark Done PATCH until 8 seconds elapse", async () => {
    const user = userEvent.setup();
    render(<AccountPage />);

    await screen.findByRole("tab", { name: /Follow-Ups/i });
    await user.click(screen.getByRole("tab", { name: /Follow-Ups/i }));

    const markDone = await screen.findByRole("button", { name: "Mark Done" });

    vi.useFakeTimers();
    fireEvent.click(markDone);

    expect(requestHal).not.toHaveBeenCalledWith(
      "/api/v1/account/engagements/future-event/actions/act_1",
      expect.objectContaining({ method: "PATCH" }),
    );

    vi.advanceTimersByTime(8000);
    await Promise.resolve();

    expect(requestHal).toHaveBeenCalledWith(
      "/api/v1/account/engagements/future-event/actions/act_1",
      expect.objectContaining({ method: "PATCH" }),
    );
  });

  it("delays registration cancellation DELETE until 8 seconds elapse", async () => {
    const user = userEvent.setup();
    render(<AccountPage />);

    await screen.findByRole("tab", { name: /My Registrations/i });
    await user.click(screen.getByRole("tab", { name: /My Registrations/i }));

    const cancelButton = await screen.findByRole("button", { name: /Cancel registration/i });
    await user.click(cancelButton);

    const confirm = await screen.findByRole("button", { name: "Confirm cancel" });

    vi.useFakeTimers();
    fireEvent.click(confirm);

    expect(requestHal).not.toHaveBeenCalledWith(
      "/api/v1/events/future-event/registrations/usr_1",
      expect.objectContaining({ method: "DELETE" }),
    );

    vi.advanceTimersByTime(8000);
    await Promise.resolve();

    expect(requestHal).toHaveBeenCalledWith(
      "/api/v1/events/future-event/registrations/usr_1",
      expect.objectContaining({ method: "DELETE" }),
    );
  });
});
