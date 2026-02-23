import { describe, expect, it } from "vitest";
import {
  REGISTRATION_CANCELLED_MESSAGE,
  REGISTRATION_CONFIRMED_MESSAGE,
  WAITLIST_CONFIRMED_MESSAGE,
  registrationCreateMessage,
} from "../registration-feedback";

describe("registration feedback messages", () => {
  it("uses waitlist copy for waitlisted status", () => {
    expect(registrationCreateMessage("WAITLISTED")).toBe(WAITLIST_CONFIRMED_MESSAGE);
  });

  it("uses registration copy for non-waitlist statuses", () => {
    expect(registrationCreateMessage("REGISTERED")).toBe(REGISTRATION_CONFIRMED_MESSAGE);
  });

  it("exposes a stable cancellation message", () => {
    expect(REGISTRATION_CANCELLED_MESSAGE).toBe("Registration canceled.");
  });
});
