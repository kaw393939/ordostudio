import { describe, expect, it, vi } from "vitest";

const acknowledgeReminder = vi.fn(() => ({ acknowledged: true }));
const snoozeReminder = vi.fn(() => ({ snoozed: true }));

vi.mock("@/lib/api/engagements", () => ({
  acknowledgeReminder: (...args: unknown[]) => acknowledgeReminder(...args),
  snoozeReminder: (...args: unknown[]) => snoozeReminder(...args),
  EngagementNotFoundError: class EngagementNotFoundError extends Error {},
  EngagementReminderNotFoundError: class EngagementReminderNotFoundError extends Error {},
  ForbiddenEngagementAccessError: class ForbiddenEngagementAccessError extends Error {},
}));

vi.mock("@/lib/api/auth", () => ({
  getSessionUserFromRequest: () => ({ id: "usr_1", email: "user@example.com", status: "ACTIVE", roles: ["USER"] }),
  isSameOriginMutation: () => true,
}));

vi.mock("@/lib/api/response", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api/response")>(
    "@/lib/api/response",
  );
  return actual;
});

describe("PATCH /api/v1/account/engagements/:slug/reminders/:id", () => {
  it("calls snoozeReminder when snooze_days is provided", async () => {
    vi.resetModules();
    const { PATCH } = await import("../[slug]/reminders/[id]/route");
    const response = await PATCH(
      new Request("http://localhost:3000/api/v1/account/engagements/future-event/reminders/rem_1", {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({ snooze_days: 3 }),
      }),
      {
        params: Promise.resolve({ slug: "future-event", id: "rem_1" }),
      },
    );

    expect(response.status).toBe(200);
    expect(snoozeReminder).toHaveBeenCalledTimes(1);
    expect(acknowledgeReminder).toHaveBeenCalledTimes(0);
  });

  it("defaults to acknowledgeReminder when no snooze_days is provided", async () => {
    vi.resetModules();
    const { PATCH } = await import("../[slug]/reminders/[id]/route");
    const response = await PATCH(
      new Request("http://localhost:3000/api/v1/account/engagements/future-event/reminders/rem_2", {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({ acknowledged: true }),
      }),
      {
        params: Promise.resolve({ slug: "future-event", id: "rem_2" }),
      },
    );

    expect(response.status).toBe(200);
    expect(acknowledgeReminder).toHaveBeenCalledTimes(1);
  });
});
