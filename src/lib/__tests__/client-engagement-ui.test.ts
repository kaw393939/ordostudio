import { describe, expect, it } from "vitest";

import { nextStepCopy, timelineStatusLabel } from "../client-engagement-ui";

describe("client engagement ui helpers", () => {
  it("formats timeline statuses for display", () => {
    expect(timelineStatusLabel("UPCOMING")).toBe("Upcoming");
    expect(timelineStatusLabel("DELIVERED")).toBe("Delivered");
    expect(timelineStatusLabel("CANCELLED")).toBe("Cancelled");
  });

  it("provides fallback text for missing next-step", () => {
    expect(nextStepCopy(null)).toBe("No follow-up recorded yet.");
    expect(nextStepCopy("  Send recap  ")).toBe("Send recap");
  });
});
