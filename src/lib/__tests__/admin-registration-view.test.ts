import { describe, expect, it } from "vitest";

import {
  buildExportFileName,
  buildRegistrationPayload,
  canCancel,
  canCheckIn,
} from "../admin-registration-view";

describe("admin registration ui helpers", () => {
  it("evaluates check-in/cancel action eligibility by status", () => {
    expect(canCheckIn("REGISTERED")).toBe(true);
    expect(canCheckIn("WAITLISTED")).toBe(true);
    expect(canCheckIn("CHECKED_IN")).toBe(false);
    expect(canCheckIn("CANCELLED")).toBe(false);

    expect(canCancel("REGISTERED")).toBe(true);
    expect(canCancel("WAITLISTED")).toBe(true);
    expect(canCancel("CHECKED_IN")).toBe(true);
    expect(canCancel("CANCELLED")).toBe(false);
  });

  it("builds registration payload from user identifier", () => {
    expect(buildRegistrationPayload("person@example.com")).toEqual({
      user_email: "person@example.com",
    });
    expect(buildRegistrationPayload("abc-123")).toEqual({ user_id: "abc-123" });
    expect(buildRegistrationPayload("   ")).toEqual({});
  });

  it("builds export file names", () => {
    expect(buildExportFileName("my-event", "json")).toBe("my-event-registrations.json");
    expect(buildExportFileName("my-event", "csv")).toBe("my-event-registrations.csv");
  });
});
