import { describe, expect, it } from "vitest";
import { attendanceInstructions, buildReminderPayload } from "../event-delivery";

describe("event delivery helpers", () => {
  it("builds online attendance instructions", () => {
    expect(attendanceInstructions({ deliveryMode: "ONLINE", locationText: null, meetingUrl: "https://meet.example.com/abc" })).toContain(
      "https://meet.example.com/abc",
    );
  });

  it("builds in-person attendance instructions", () => {
    expect(attendanceInstructions({ deliveryMode: "IN_PERSON", locationText: "123 Main St", meetingUrl: null })).toContain(
      "123 Main St",
    );
  });

  it("builds mode-aware reminder payload", () => {
    const payload = buildReminderPayload({
      title: "Hybrid Session",
      startAt: "2026-03-01T15:00:00.000Z",
      timezone: "UTC",
      deliveryMode: "HYBRID",
      locationText: "HQ Room 4",
      meetingUrl: "https://meet.example.com/hybrid",
    });

    expect(payload.template).toBe("event_reminder_v1");
    expect(payload.data.delivery_mode).toBe("HYBRID");
    expect(payload.data.how_to_attend).toContain("HQ Room 4");
    expect(payload.data.how_to_attend).toContain("https://meet.example.com/hybrid");
  });
});
