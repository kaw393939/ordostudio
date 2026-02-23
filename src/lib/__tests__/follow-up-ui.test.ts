import { describe, expect, it } from "vitest";

import { followUpDueLabel, followUpStatusLabel } from "../follow-up-ui";

describe("follow-up ui", () => {
  it("formats follow-up status labels", () => {
    expect(followUpStatusLabel("OPEN")).toBe("Open");
    expect(followUpStatusLabel("IN_PROGRESS")).toBe("In progress");
    expect(followUpStatusLabel("DONE")).toBe("Done");
    expect(followUpStatusLabel("BLOCKED")).toBe("Blocked");
  });

  it("renders due-date labels", () => {
    expect(followUpDueLabel(null)).toBe("No due date");
    expect(followUpDueLabel("not-a-date")).toBe("No due date");
  });
});
