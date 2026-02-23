/**
 * Ledger entry lifecycle state machine.
 *
 * Normal flow:  EARNED → APPROVED → PAID
 * Void paths:   EARNED → VOID, APPROVED → VOID
 * Terminal:     PAID, VOID (no outgoing arcs)
 */
import { InvalidInputError } from "./errors";

export type LedgerEntryStatus = "EARNED" | "APPROVED" | "PAID" | "VOID";

const ALLOWED_TRANSITIONS: Record<LedgerEntryStatus, LedgerEntryStatus[]> = {
  EARNED:   ["APPROVED", "VOID"],
  APPROVED: ["PAID", "VOID"],
  PAID:     [],
  VOID:     [],
};

export const LEDGER_TERMINAL_STATES: readonly LedgerEntryStatus[] = ["PAID", "VOID"];

export const isLedgerTerminal = (status: LedgerEntryStatus): boolean =>
  LEDGER_TERMINAL_STATES.includes(status);

/**
 * Assert and return a valid next ledger entry status. Self-transitions are
 * no-ops. Invalid transitions throw `InvalidInputError`.
 */
export const transitionLedgerStatus = (from: LedgerEntryStatus, to: LedgerEntryStatus): LedgerEntryStatus => {
  if (from === to) {
    return to;
  }
  if (!ALLOWED_TRANSITIONS[from].includes(to)) {
    throw new InvalidInputError(`invalid_ledger_transition:${from}->${to}`);
  }
  return to;
};
