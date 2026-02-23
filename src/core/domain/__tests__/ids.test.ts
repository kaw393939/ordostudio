/**
 * TDD-13: Typed branded IDs
 *
 * Tests written BEFORE implementation (RED phase).
 */
import { describe, it, expect } from "vitest";
import {
  UserId,
  DealId,
  LedgerEntryId,
  EventId,
  RegistrationId,
  IntakeRequestId,
  OfferId,
} from "@/core/domain/ids";

describe("Branded IDs — construction", () => {
  it("creates a UserId from a non-empty string", () => {
    const uid = UserId("abc-123");
    // At runtime it's just a string, but branded at the type level
    expect(uid).toBe("abc-123");
  });

  it("throws on empty string for UserId", () => {
    expect(() => UserId("")).toThrow();
  });

  it("throws on blank string for UserId", () => {
    expect(() => UserId("   ")).toThrow();
  });

  it("creates DealId", () => {
    expect(DealId("deal-1")).toBe("deal-1");
  });

  it("creates LedgerEntryId", () => {
    expect(LedgerEntryId("le-1")).toBe("le-1");
  });

  it("creates EventId", () => {
    expect(EventId("evt-1")).toBe("evt-1");
  });

  it("creates RegistrationId", () => {
    expect(RegistrationId("reg-1")).toBe("reg-1");
  });

  it("creates IntakeRequestId", () => {
    expect(IntakeRequestId("ir-1")).toBe("ir-1");
  });

  it("creates OfferId", () => {
    expect(OfferId("off-1")).toBe("off-1");
  });
});

describe("Branded IDs — type safety (compile time)", () => {
  it("branded IDs are strings at runtime", () => {
    const uid = UserId("abc");
    expect(typeof uid).toBe("string");
    expect(uid.length).toBe(3);
  });
});
