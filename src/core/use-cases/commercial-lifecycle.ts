import { InvalidInputError } from "../domain/errors";

export type ProposalStatus = "DRAFT" | "SENT" | "ACCEPTED" | "DECLINED" | "EXPIRED";
export type InvoiceStatus = "DRAFT" | "ISSUED" | "PARTIALLY_PAID" | "PAID" | "VOID";

const assertTransition = <T extends string>(
  from: T,
  to: T,
  allowed: Record<T, T[]>,
  scope: string,
): void => {
  if (from === to) {
    return;
  }

  if (!allowed[from].includes(to)) {
    throw new InvalidInputError(`invalid_${scope}_transition:${from}->${to}`);
  }
};

export const transitionProposalStatus = (from: ProposalStatus, to: ProposalStatus): ProposalStatus => {
  assertTransition(
    from,
    to,
    {
      DRAFT: ["SENT", "DECLINED", "EXPIRED"],
      SENT: ["ACCEPTED", "DECLINED", "EXPIRED"],
      ACCEPTED: [],
      DECLINED: [],
      EXPIRED: [],
    },
    "proposal",
  );

  return to;
};

export const transitionInvoiceStatus = (from: InvoiceStatus, to: InvoiceStatus): InvoiceStatus => {
  assertTransition(
    from,
    to,
    {
      DRAFT: ["ISSUED", "VOID"],
      ISSUED: ["PARTIALLY_PAID", "PAID", "VOID"],
      PARTIALLY_PAID: ["PAID", "VOID"],
      PAID: [],
      VOID: [],
    },
    "invoice",
  );

  return to;
};

export const deriveInvoicePaymentStatus = (args: {
  amountCents: number;
  paidCents: number;
  currentStatus: InvoiceStatus;
}): InvoiceStatus => {
  if (args.currentStatus === "VOID") {
    return "VOID";
  }

  if (args.amountCents <= 0) {
    throw new InvalidInputError("invoice_amount_invalid");
  }

  if (args.paidCents <= 0) {
    return args.currentStatus === "DRAFT" ? "DRAFT" : "ISSUED";
  }

  if (args.paidCents >= args.amountCents) {
    return "PAID";
  }

  return "PARTIALLY_PAID";
};

export const parseProposalStatus = (value: string): ProposalStatus => {
  const normalized = value.trim().toUpperCase();
  if (
    normalized !== "DRAFT" &&
    normalized !== "SENT" &&
    normalized !== "ACCEPTED" &&
    normalized !== "DECLINED" &&
    normalized !== "EXPIRED"
  ) {
    throw new InvalidInputError("invalid_proposal_status");
  }

  return normalized;
};

export const parseInvoiceStatus = (value: string): InvoiceStatus => {
  const normalized = value.trim().toUpperCase();
  if (
    normalized !== "DRAFT" &&
    normalized !== "ISSUED" &&
    normalized !== "PARTIALLY_PAID" &&
    normalized !== "PAID" &&
    normalized !== "VOID"
  ) {
    throw new InvalidInputError("invalid_invoice_status");
  }

  return normalized;
};
