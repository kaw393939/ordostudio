import { describe, expect, it } from "vitest";
import {
  auditQuickRangeValues,
  auditSeverityForAction,
  actionGuidance,
  bulkEligibleForCancel,
  bulkEligibleForCheckin,
  canIncludeEmailExport,
  exportGovernanceCopy,
  exportPreview,
  filterRegistrations,
  summarizeAuditMetadata,
  validateAuditDateRange,
} from "../admin-operations-ui";

const sample = [
  { id: "1", user_id: "u-1", user_email: "a@example.com", status: "REGISTERED" as const },
  { id: "2", user_id: "u-2", user_email: "b@example.com", status: "WAITLISTED" as const },
  { id: "3", user_id: "u-3", user_email: "c@example.com", status: "CHECKED_IN" as const },
  { id: "4", user_id: "u-4", user_email: "d@example.com", status: "CANCELLED" as const },
];

describe("admin operations ui helpers", () => {
  it("filters registrations by query and status", () => {
    expect(filterRegistrations(sample, "a@", "all")).toHaveLength(1);
    expect(filterRegistrations(sample, "", "WAITLISTED")).toHaveLength(1);
    expect(filterRegistrations(sample, "u-3", "CHECKED_IN")).toHaveLength(1);
  });

  it("computes bulk check-in eligibility", () => {
    const eligible = bulkEligibleForCheckin(sample, ["u-1", "u-2", "u-3", "u-4"]);
    expect(eligible).toEqual(["u-1", "u-2"]);
  });

  it("computes bulk cancel eligibility", () => {
    const eligible = bulkEligibleForCancel(sample, ["u-1", "u-2", "u-3", "u-4"]);
    expect(eligible).toEqual(["u-1", "u-2", "u-3"]);
  });

  it("returns action guidance by status", () => {
    expect(actionGuidance("CANCELLED").checkin).toContain("Re-register");
    expect(actionGuidance("CHECKED_IN").checkin).toContain("Already checked in");
  });

  it("handles export governance and preview helpers", () => {
    expect(canIncludeEmailExport("localhost")).toBe(true);
    expect(canIncludeEmailExport("example.com")).toBe(false);
    expect(exportGovernanceCopy("example.com")).toContain("blocked");
    expect(exportPreview("csv", "a,b\n1,2\n3,4")).toContain("1,2");
    expect(exportPreview("json", '{"a":1,"b":2}')).toContain('"a":1');
  });

  it("classifies audit actions by severity", () => {
    expect(auditSeverityForAction("account.delete.requested")).toBe("critical");
    expect(auditSeverityForAction("user.roles.updated")).toBe("high");
    expect(auditSeverityForAction("registration.checked_in")).toBe("medium");
    expect(auditSeverityForAction("profile.viewed")).toBe("low");
  });

  it("summarizes metadata safely", () => {
    expect(summarizeAuditMetadata(null)).toBe("No metadata");
    expect(summarizeAuditMetadata({})).toBe("No metadata");
    expect(summarizeAuditMetadata({ actor: "keith", status: "ok", count: 2 })).toContain("actor: keith");
  });

  it("returns quick date ranges", () => {
    const now = new Date("2025-01-01T12:00:00.000Z");
    const values = auditQuickRangeValues("1h", now);
    expect(values.from).toHaveLength(16);
    expect(values.to).toHaveLength(16);
  });

  it("validates audit date ranges", () => {
    expect(validateAuditDateRange("", "")).toEqual({ valid: true });
    expect(validateAuditDateRange("bad-date", "")).toEqual({ valid: false, message: "From date is invalid." });
    expect(validateAuditDateRange("2025-01-02T00:00", "2025-01-01T00:00")).toEqual({
      valid: false,
      message: "From date must be earlier than To date.",
    });

    const valid = validateAuditDateRange("2025-01-01T00:00", "2025-01-01T01:00");
    expect(valid.valid).toBe(true);
    if (valid.valid) {
      expect(valid.fromIso).toMatch(/2025-01-01T/);
      expect(valid.toIso).toMatch(/2025-01-01T/);
    }
  });
});
