import { describe, expect, it } from "vitest";
import { InvalidInputError } from "../../domain/errors";
import { parseEngagementType } from "../event-engagement";

describe("event engagement type", () => {
  it("defaults to individual when omitted", () => {
    expect(parseEngagementType()).toBe("INDIVIDUAL");
  });

  it("accepts individual and group values", () => {
    expect(parseEngagementType("individual")).toBe("INDIVIDUAL");
    expect(parseEngagementType("GROUP")).toBe("GROUP");
  });

  it("rejects unsupported values", () => {
    expect(() => parseEngagementType("team")).toThrowError(InvalidInputError);
  });
});
