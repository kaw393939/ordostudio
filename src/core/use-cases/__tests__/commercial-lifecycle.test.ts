import { describe, expect, it } from "vitest";
import { InvalidInputError } from "../../domain/errors";
import {
  deriveInvoicePaymentStatus,
  transitionInvoiceStatus,
  transitionProposalStatus,
} from "../commercial-lifecycle";

describe("commercial lifecycle transitions", () => {
  it("validates proposal transitions", () => {
    expect(transitionProposalStatus("DRAFT", "SENT")).toBe("SENT");
    expect(() => transitionProposalStatus("DRAFT", "ACCEPTED")).toThrowError(
      new InvalidInputError("invalid_proposal_transition:DRAFT->ACCEPTED"),
    );
  });

  it("validates invoice transitions", () => {
    expect(transitionInvoiceStatus("DRAFT", "ISSUED")).toBe("ISSUED");
    expect(() => transitionInvoiceStatus("PAID", "ISSUED")).toThrowError(
      new InvalidInputError("invalid_invoice_transition:PAID->ISSUED"),
    );
  });

  it("derives invoice payment status from payments", () => {
    expect(deriveInvoicePaymentStatus({ amountCents: 10000, paidCents: 0, currentStatus: "ISSUED" })).toBe("ISSUED");
    expect(deriveInvoicePaymentStatus({ amountCents: 10000, paidCents: 5000, currentStatus: "ISSUED" })).toBe(
      "PARTIALLY_PAID",
    );
    expect(deriveInvoicePaymentStatus({ amountCents: 10000, paidCents: 10000, currentStatus: "ISSUED" })).toBe(
      "PAID",
    );
  });
});
