/**
 * TDD-13: Ledger entry lifecycle state machine
 *
 * Tests written BEFORE implementation (RED phase).
 * States: EARNED → APPROVED → PAID.
 * Voiding: EARNED and APPROVED can move to VOID. PAID and VOID cannot be voided.
 */
import { describe, it, expect } from "vitest";
import {
  type LedgerEntryStatus,
  transitionLedgerStatus,
  LEDGER_TERMINAL_STATES,
  isLedgerTerminal,
} from "@/core/domain/ledger-lifecycle";

describe("Ledger lifecycle — valid transitions", () => {
  const validTransitions: Array<[LedgerEntryStatus, LedgerEntryStatus]> = [
    ["EARNED", "APPROVED"],
    ["APPROVED", "PAID"],
    // Voiding paths
    ["EARNED", "VOID"],
    ["APPROVED", "VOID"],
  ];

  it.each(validTransitions)("%s → %s is allowed", (from, to) => {
    expect(transitionLedgerStatus(from, to)).toBe(to);
  });

  it("self-transition is a no-op", () => {
    expect(transitionLedgerStatus("EARNED", "EARNED")).toBe("EARNED");
  });
});

describe("Ledger lifecycle — invalid transitions", () => {
  const invalidTransitions: Array<[LedgerEntryStatus, LedgerEntryStatus]> = [
    ["EARNED", "PAID"],      // must pass through APPROVED
    ["PAID", "EARNED"],      // PAID is terminal
    ["PAID", "APPROVED"],    // PAID is terminal
    ["PAID", "VOID"],        // PAID cannot be voided
    ["VOID", "EARNED"],      // VOID is terminal
    ["VOID", "APPROVED"],    // VOID is terminal
    ["VOID", "PAID"],        // VOID is terminal
    ["APPROVED", "EARNED"],  // No backward
  ];

  it.each(invalidTransitions)("%s → %s throws", (from, to) => {
    expect(() => transitionLedgerStatus(from, to)).toThrow("invalid_ledger_transition");
  });
});

describe("Ledger lifecycle — terminal states", () => {
  it("PAID and VOID are terminal", () => {
    expect(LEDGER_TERMINAL_STATES).toEqual(expect.arrayContaining(["PAID", "VOID"]));
  });

  it("isLedgerTerminal returns true for terminal states", () => {
    expect(isLedgerTerminal("PAID")).toBe(true);
    expect(isLedgerTerminal("VOID")).toBe(true);
  });

  it("isLedgerTerminal returns false for non-terminal states", () => {
    expect(isLedgerTerminal("EARNED")).toBe(false);
    expect(isLedgerTerminal("APPROVED")).toBe(false);
  });

  it("terminal states have no outgoing transitions", () => {
    for (const state of LEDGER_TERMINAL_STATES) {
      for (const target of ["EARNED", "APPROVED", "PAID", "VOID"] as LedgerEntryStatus[]) {
        if (target !== state) {
          expect(() => transitionLedgerStatus(state, target)).toThrow();
        }
      }
    }
  });
});
