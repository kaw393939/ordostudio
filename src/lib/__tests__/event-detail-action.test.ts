import { describe, expect, it } from "vitest";
import {
  normalizeRegistrationStatus,
  resolvePrimaryAction,
  statusChipClass,
} from "../event-detail-action";

describe("event detail action helper", () => {
  it("normalizes unknown status to NOT_REGISTERED", () => {
    expect(normalizeRegistrationStatus(undefined)).toBe("NOT_REGISTERED");
    expect(normalizeRegistrationStatus("unknown")).toBe("NOT_REGISTERED");
    expect(normalizeRegistrationStatus("REGISTERED")).toBe("REGISTERED");
  });

  it("resolves login action for anonymous user when register affordance exists", () => {
    const action = resolvePrimaryAction({
      loggedIn: false,
      registrationStatus: "NOT_REGISTERED",
      links: {
        "app:register": { href: "/api/v1/events/sample/registrations" },
      },
    });

    expect(action.kind).toBe("login");
  });

  it("resolves login action for anonymous user when waitlist affordance exists", () => {
    const action = resolvePrimaryAction({
      loggedIn: false,
      registrationStatus: "NOT_REGISTERED",
      links: {
        "app:join-waitlist": { href: "/api/v1/events/sample/registrations" },
      },
    });

    expect(action.kind).toBe("login");
  });

  it("resolves cancel action for registered/waitlisted user with cancel affordance", () => {
    const action = resolvePrimaryAction({
      loggedIn: true,
      registrationStatus: "WAITLISTED",
      links: {
        "app:register": { href: "/api/v1/events/sample/registrations" },
        "app:my-registration": { href: "/api/v1/events/sample/registrations/u-1" },
      },
    });

    expect(action.kind).toBe("cancel");
  });

  it("resolves register action for eligible user with register affordance", () => {
    const action = resolvePrimaryAction({
      loggedIn: true,
      registrationStatus: "CANCELLED",
      links: {
        "app:register": { href: "/api/v1/events/sample/registrations" },
      },
    });

    expect(action.kind).toBe("register");
  });

  it("resolves waitlist action for eligible user with waitlist affordance", () => {
    const action = resolvePrimaryAction({
      loggedIn: true,
      registrationStatus: "NOT_REGISTERED",
      links: {
        "app:join-waitlist": { href: "/api/v1/events/sample/registrations" },
      },
    });

    expect(action.kind).toBe("waitlist");
  });

  it("returns no action when no affordances exist", () => {
    const action = resolvePrimaryAction({
      loggedIn: true,
      registrationStatus: "REGISTERED",
      links: {},
    });

    expect(action.kind).toBe("none");
  });

  it("returns expected status chip classes", () => {
    expect(statusChipClass("REGISTERED")).toContain("state-success");
    expect(statusChipClass("WAITLISTED")).toContain("state-warning");
    expect(statusChipClass("CANCELLED")).toContain("state-danger");
    expect(statusChipClass("CHECKED_IN")).toContain("state-info");
  });
});
