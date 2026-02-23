/**
 * Deal lifecycle state machine.
 *
 * Uses the same assertTransition pattern as commercial-lifecycle.ts
 * and instructor-assignment.ts.
 *
 * Happy-path flow:
 *   QUEUED → ASSIGNED → MAESTRO_APPROVED → PAID → IN_PROGRESS → DELIVERED → CLOSED
 *
 * External payment: Stripe can mark a deal PAID from any pre-payment state.
 * Refund branches:  PAID / IN_PROGRESS / DELIVERED can reach REFUNDED.
 * Short-path:       PAID → DELIVERED (skip IN_PROGRESS for quick engagements).
 */
import { InvalidInputError } from "./errors";

export type DealStatus =
  | "QUEUED"
  | "ASSIGNED"
  | "MAESTRO_APPROVED"
  | "PAID"
  | "IN_PROGRESS"
  | "DELIVERED"
  | "CLOSED"
  | "REFUNDED";

const ALLOWED_TRANSITIONS: Record<DealStatus, DealStatus[]> = {
  QUEUED:            ["ASSIGNED", "PAID"],
  ASSIGNED:          ["MAESTRO_APPROVED", "PAID"],
  MAESTRO_APPROVED:  ["PAID", "IN_PROGRESS"],
  PAID:              ["IN_PROGRESS", "DELIVERED", "REFUNDED"],
  IN_PROGRESS:       ["DELIVERED", "REFUNDED"],
  DELIVERED:         ["CLOSED", "REFUNDED"],
  CLOSED:            [],
  REFUNDED:          [],
};

export const DEAL_TERMINAL_STATES: readonly DealStatus[] = ["CLOSED", "REFUNDED"];

export const isDealTerminal = (status: DealStatus): boolean =>
  DEAL_TERMINAL_STATES.includes(status);

/**
 * Assert and return a valid next deal status. Self-transitions are no-ops.
 * Invalid transitions throw `InvalidInputError`.
 */
export const transitionDealStatus = (from: DealStatus, to: DealStatus): DealStatus => {
  if (from === to) {
    return to;
  }
  if (!ALLOWED_TRANSITIONS[from].includes(to)) {
    throw new InvalidInputError(`invalid_deal_transition:${from}->${to}`);
  }
  return to;
};
