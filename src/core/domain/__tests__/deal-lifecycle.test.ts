/**
 * TDD-13: Deal lifecycle state machine
 *
 * Tests written BEFORE implementation (RED phase).
 * Follows the assertTransition pattern from commercial-lifecycle.ts.
 */
import { describe, it, expect } from "vitest";
import {
  type DealStatus,
  transitionDealStatus,
  DEAL_TERMINAL_STATES,
  isDealTerminal,
} from "@/core/domain/deal-lifecycle";

describe("Deal lifecycle — valid transitions", () => {
  const validTransitions: Array<[DealStatus, DealStatus]> = [
    // Happy path
    ["QUEUED", "ASSIGNED"],
    ["ASSIGNED", "MAESTRO_APPROVED"],
    ["MAESTRO_APPROVED", "PAID"],
    ["PAID", "IN_PROGRESS"],
    ["IN_PROGRESS", "DELIVERED"],
    ["DELIVERED", "CLOSED"],
    // External payment (Stripe can pay from any pre-payment state)
    ["QUEUED", "PAID"],
    ["ASSIGNED", "PAID"],
    ["MAESTRO_APPROVED", "PAID"],
    // IN_PROGRESS from MAESTRO_APPROVED (business rule still requires PAID gate)
    ["MAESTRO_APPROVED", "IN_PROGRESS"],
    // Short-path delivery (skip IN_PROGRESS for quick engagements)
    ["PAID", "DELIVERED"],
    // Refund paths
    ["PAID", "REFUNDED"],
    ["IN_PROGRESS", "REFUNDED"],
    ["DELIVERED", "REFUNDED"],
  ];

  it.each(validTransitions)("%s → %s is allowed", (from, to) => {
    expect(transitionDealStatus(from, to)).toBe(to);
  });

  it("self-transition is a no-op", () => {
    expect(transitionDealStatus("QUEUED", "QUEUED")).toBe("QUEUED");
  });
});

describe("Deal lifecycle — invalid transitions", () => {
  const invalidTransitions: Array<[DealStatus, DealStatus]> = [
    ["QUEUED", "IN_PROGRESS"],
    ["QUEUED", "DELIVERED"],
    ["ASSIGNED", "IN_PROGRESS"],
    ["MAESTRO_APPROVED", "DELIVERED"],
    ["CLOSED", "QUEUED"],
    ["REFUNDED", "QUEUED"],
    ["REFUNDED", "PAID"],
    ["CLOSED", "IN_PROGRESS"],
  ];

  it.each(invalidTransitions)("%s → %s throws", (from, to) => {
    expect(() => transitionDealStatus(from, to)).toThrow("invalid_deal_transition");
  });
});

describe("Deal lifecycle — terminal states", () => {
  it("CLOSED and REFUNDED are terminal", () => {
    expect(DEAL_TERMINAL_STATES).toEqual(expect.arrayContaining(["CLOSED", "REFUNDED"]));
  });

  it("isDealTerminal returns true for terminal states", () => {
    expect(isDealTerminal("CLOSED")).toBe(true);
    expect(isDealTerminal("REFUNDED")).toBe(true);
  });

  it("isDealTerminal returns false for non-terminal states", () => {
    expect(isDealTerminal("QUEUED")).toBe(false);
    expect(isDealTerminal("PAID")).toBe(false);
    expect(isDealTerminal("IN_PROGRESS")).toBe(false);
  });

  it("terminal states have no outgoing transitions", () => {
    for (const state of DEAL_TERMINAL_STATES) {
      for (const target of ["QUEUED", "ASSIGNED", "MAESTRO_APPROVED", "PAID", "IN_PROGRESS", "DELIVERED", "CLOSED", "REFUNDED"] as DealStatus[]) {
        if (target !== state) {
          expect(() => transitionDealStatus(state, target)).toThrow();
        }
      }
    }
  });
});
