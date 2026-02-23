import { randomUUID } from "node:crypto";
import { resolveConfig } from "@/platform/config";
import { appendAuditLog, openCliDb } from "@/platform/runtime";
import { getCurrency } from "@/platform/locale";
import { InvalidInputError } from "../../core/domain/errors";
import { parseISO } from "@/lib/date-time";
import {
  deriveInvoicePaymentStatus,
  parseInvoiceStatus,
  parseProposalStatus,
  transitionInvoiceStatus,
  transitionProposalStatus,
} from "../../core/use-cases/commercial-lifecycle";

export type ProposalRecord = {
  id: string;
  intake_request_id: string | null;
  event_id: string | null;
  offer_slug: string | null;
  client_email: string;
  title: string;
  amount_cents: number;
  currency: string;
  status: "DRAFT" | "SENT" | "ACCEPTED" | "DECLINED" | "EXPIRED";
  expires_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type InvoiceRecord = {
  id: string;
  proposal_id: string | null;
  intake_request_id: string | null;
  event_id: string | null;
  client_email: string;
  amount_cents: number;
  currency: string;
  status: "DRAFT" | "ISSUED" | "PARTIALLY_PAID" | "PAID" | "VOID";
  issued_at: string | null;
  due_at: string | null;
  paid_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type PaymentRecord = {
  id: string;
  invoice_id: string;
  amount_cents: number;
  currency: string;
  status: "RECORDED" | "REVERSED";
  paid_at: string;
  reference: string | null;
  recorded_by: string | null;
  created_at: string;
  updated_at: string;
};

const normalizeEmail = (value: string): string => {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed.includes("@")) {
    throw new InvalidInputError("invalid_client_email");
  }
  return trimmed;
};

const normalizeMoney = (amountCents: number): number => {
  if (!Number.isInteger(amountCents) || amountCents <= 0) {
    throw new InvalidInputError("invalid_amount_cents");
  }
  return amountCents;
};

const normalizeCurrency = (value: string): string => {
  const normalized = value.trim().toUpperCase();
  if (normalized.length !== 3) {
    throw new InvalidInputError("invalid_currency");
  }
  return normalized;
};

const parseIsoOrNull = (value?: string): string | null => {
  if (!value) {
    return null;
  }

  try {
    return parseISO(value).toISOString();
  } catch {
    throw new InvalidInputError("invalid_datetime");
  }
};

const hasCommercialTables = (db: ReturnType<typeof openCliDb>): boolean => {
  const row = db
    .prepare("SELECT 1 AS present FROM sqlite_master WHERE type = 'table' AND name = 'proposals'")
    .get() as { present?: number } | undefined;
  return row?.present === 1;
};

const assertLinkedArtifact = (args: {
  intakeRequestId?: string;
  eventId?: string;
  offerSlug?: string;
}): void => {
  if (!args.intakeRequestId && !args.eventId && !args.offerSlug) {
    throw new InvalidInputError("proposal_requires_linked_artifact");
  }
};

const resolveEventId = (db: ReturnType<typeof openCliDb>, eventSlug?: string): string | null => {
  if (!eventSlug) {
    return null;
  }

  const row = db.prepare("SELECT id FROM events WHERE slug = ?").get(eventSlug) as { id: string } | undefined;
  if (!row) {
    throw new InvalidInputError("event_not_found_for_link");
  }

  return row.id;
};

const resolveIntakeId = (db: ReturnType<typeof openCliDb>, intakeRequestId?: string): string | null => {
  if (!intakeRequestId) {
    return null;
  }

  const row = db.prepare("SELECT id FROM intake_requests WHERE id = ?").get(intakeRequestId) as { id: string } | undefined;
  if (!row) {
    throw new InvalidInputError("intake_request_not_found_for_link");
  }

  return row.id;
};

export const listProposals = (filters?: { status?: string; clientEmail?: string; offerSlug?: string }) => {
  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);
  try {
    if (!hasCommercialTables(db)) {
      return [] as ProposalRecord[];
    }

    const where: string[] = [];
    const params: unknown[] = [];

    if (filters?.status) {
      where.push("status = ?");
      params.push(parseProposalStatus(filters.status));
    }

    if (filters?.clientEmail) {
      where.push("client_email = ?");
      params.push(normalizeEmail(filters.clientEmail));
    }

    if (filters?.offerSlug) {
      where.push("offer_slug = ?");
      params.push(filters.offerSlug.trim());
    }

    const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";

    return db
      .prepare(
        `
SELECT id, intake_request_id, event_id, offer_slug, client_email, title, amount_cents, currency, status, expires_at, created_by, created_at, updated_at
FROM proposals
${whereSql}
ORDER BY created_at DESC
`,
      )
      .all(...params) as ProposalRecord[];
  } finally {
    db.close();
  }
};

export const createProposal = (
  input: {
    intake_request_id?: string;
    event_slug?: string;
    offer_slug?: string;
    client_email: string;
    title: string;
    amount_cents: number;
    currency: string;
    expires_at?: string;
  },
  actorId: string,
  requestId: string,
): ProposalRecord => {
  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);
  try {
    if (!hasCommercialTables(db)) {
      throw new InvalidInputError("commercial_schema_not_ready");
    }

    const title = input.title.trim();
    if (!title) {
      throw new InvalidInputError("proposal_title_required");
    }

    const intakeId = resolveIntakeId(db, input.intake_request_id);
    const eventId = resolveEventId(db, input.event_slug);
    const offerSlug = input.offer_slug?.trim() || null;
    assertLinkedArtifact({ intakeRequestId: intakeId ?? undefined, eventId: eventId ?? undefined, offerSlug: offerSlug ?? undefined });

    const now = new Date().toISOString();
    const created: ProposalRecord = {
      id: randomUUID(),
      intake_request_id: intakeId,
      event_id: eventId,
      offer_slug: offerSlug,
      client_email: normalizeEmail(input.client_email),
      title,
      amount_cents: normalizeMoney(input.amount_cents),
      currency: normalizeCurrency(input.currency),
      status: "DRAFT",
      expires_at: parseIsoOrNull(input.expires_at),
      created_by: actorId,
      created_at: now,
      updated_at: now,
    };

    db.prepare(
      `
INSERT INTO proposals (
  id, intake_request_id, event_id, offer_slug, client_email, title, amount_cents, currency, status, expires_at, created_by, created_at, updated_at
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`,
    ).run(
      created.id,
      created.intake_request_id,
      created.event_id,
      created.offer_slug,
      created.client_email,
      created.title,
      created.amount_cents,
      created.currency,
      created.status,
      created.expires_at,
      created.created_by,
      created.created_at,
      created.updated_at,
    );

    db.prepare(
      `
INSERT INTO proposal_status_history (id, proposal_id, from_status, to_status, note, changed_by, changed_at)
VALUES (?, ?, ?, ?, ?, ?, ?)
`,
    ).run(randomUUID(), created.id, null, created.status, "proposal created", actorId, now);

    appendAuditLog(db, {
      actorType: "USER",
      actorId,
      action: "api.commercial.proposal.create",
      targetType: "proposal",
      requestId,
      metadata: {
        proposalId: created.id,
        eventId: created.event_id,
        intakeRequestId: created.intake_request_id,
      },
    });

    return created;
  } finally {
    db.close();
  }
};

export const updateProposalStatus = (
  proposalId: string,
  status: string,
  actorId: string,
  requestId: string,
  note?: string,
): ProposalRecord => {
  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);
  try {
    const found = db
      .prepare(
        "SELECT id, intake_request_id, event_id, offer_slug, client_email, title, amount_cents, currency, status, expires_at, created_by, created_at, updated_at FROM proposals WHERE id = ?",
      )
      .get(proposalId) as ProposalRecord | undefined;

    if (!found) {
      throw new InvalidInputError("proposal_not_found");
    }

    const nextStatus = transitionProposalStatus(found.status, parseProposalStatus(status));
    const now = new Date().toISOString();

    db.prepare("UPDATE proposals SET status = ?, updated_at = ? WHERE id = ?").run(nextStatus, now, proposalId);
    db.prepare(
      "INSERT INTO proposal_status_history (id, proposal_id, from_status, to_status, note, changed_by, changed_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    ).run(randomUUID(), proposalId, found.status, nextStatus, note?.trim() || null, actorId, now);

    appendAuditLog(db, {
      actorType: "USER",
      actorId,
      action: "api.commercial.proposal.transition",
      targetType: "proposal",
      requestId,
      metadata: {
        proposalId,
        fromStatus: found.status,
        toStatus: nextStatus,
      },
    });

    return {
      ...found,
      status: nextStatus,
      updated_at: now,
    };
  } finally {
    db.close();
  }
};

const getInvoicePaidCents = (db: ReturnType<typeof openCliDb>, invoiceId: string): number => {
  const row = db
    .prepare(
      "SELECT COALESCE(SUM(CASE WHEN status='RECORDED' THEN amount_cents WHEN status='REVERSED' THEN -amount_cents ELSE 0 END),0) AS paid_cents FROM payments WHERE invoice_id = ?",
    )
    .get(invoiceId) as { paid_cents: number };
  return row.paid_cents;
};

export const listInvoices = (filters?: { status?: string; clientEmail?: string }) => {
  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);
  try {
    if (!hasCommercialTables(db)) {
      return [] as InvoiceRecord[];
    }

    const where: string[] = [];
    const params: unknown[] = [];

    if (filters?.status) {
      where.push("status = ?");
      params.push(parseInvoiceStatus(filters.status));
    }

    if (filters?.clientEmail) {
      where.push("client_email = ?");
      params.push(normalizeEmail(filters.clientEmail));
    }

    const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";

    return db
      .prepare(
        `
SELECT id, proposal_id, intake_request_id, event_id, client_email, amount_cents, currency, status, issued_at, due_at, paid_at, created_by, created_at, updated_at
FROM invoices
${whereSql}
ORDER BY created_at DESC
`,
      )
      .all(...params) as InvoiceRecord[];
  } finally {
    db.close();
  }
};

export const createInvoice = (
  input: {
    proposal_id?: string;
    event_slug?: string;
    intake_request_id?: string;
    client_email?: string;
    amount_cents?: number;
    currency?: string;
    due_at?: string;
  },
  actorId: string,
  requestId: string,
): InvoiceRecord => {
  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);
  try {
    if (!hasCommercialTables(db)) {
      throw new InvalidInputError("commercial_schema_not_ready");
    }

    let proposal: ProposalRecord | undefined;
    if (input.proposal_id) {
      proposal = db
        .prepare(
          "SELECT id, intake_request_id, event_id, offer_slug, client_email, title, amount_cents, currency, status, expires_at, created_by, created_at, updated_at FROM proposals WHERE id = ?",
        )
        .get(input.proposal_id) as ProposalRecord | undefined;

      if (!proposal) {
        throw new InvalidInputError("proposal_not_found");
      }
    }

    const now = new Date().toISOString();
    const invoice: InvoiceRecord = {
      id: randomUUID(),
      proposal_id: proposal?.id ?? input.proposal_id ?? null,
      intake_request_id: proposal?.intake_request_id ?? resolveIntakeId(db, input.intake_request_id),
      event_id: proposal?.event_id ?? resolveEventId(db, input.event_slug),
      client_email: normalizeEmail(input.client_email ?? proposal?.client_email ?? ""),
      amount_cents: normalizeMoney(input.amount_cents ?? proposal?.amount_cents ?? 0),
      currency: normalizeCurrency(input.currency ?? proposal?.currency ?? getCurrency()),
      status: "DRAFT",
      issued_at: null,
      due_at: parseIsoOrNull(input.due_at),
      paid_at: null,
      created_by: actorId,
      created_at: now,
      updated_at: now,
    };

    db.prepare(
      `
INSERT INTO invoices (
  id, proposal_id, intake_request_id, event_id, client_email, amount_cents, currency, status, issued_at, due_at, paid_at, created_by, created_at, updated_at
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`,
    ).run(
      invoice.id,
      invoice.proposal_id,
      invoice.intake_request_id,
      invoice.event_id,
      invoice.client_email,
      invoice.amount_cents,
      invoice.currency,
      invoice.status,
      invoice.issued_at,
      invoice.due_at,
      invoice.paid_at,
      invoice.created_by,
      invoice.created_at,
      invoice.updated_at,
    );

    db.prepare(
      "INSERT INTO invoice_status_history (id, invoice_id, from_status, to_status, note, changed_by, changed_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    ).run(randomUUID(), invoice.id, null, invoice.status, "invoice created", actorId, now);

    appendAuditLog(db, {
      actorType: "USER",
      actorId,
      action: "api.commercial.invoice.create",
      targetType: "invoice",
      requestId,
      metadata: {
        invoiceId: invoice.id,
        proposalId: invoice.proposal_id,
      },
    });

    return invoice;
  } finally {
    db.close();
  }
};

export const updateInvoiceStatus = (
  invoiceId: string,
  status: string,
  actorId: string,
  requestId: string,
  note?: string,
): InvoiceRecord => {
  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);
  try {
    const found = db
      .prepare(
        "SELECT id, proposal_id, intake_request_id, event_id, client_email, amount_cents, currency, status, issued_at, due_at, paid_at, created_by, created_at, updated_at FROM invoices WHERE id = ?",
      )
      .get(invoiceId) as InvoiceRecord | undefined;

    if (!found) {
      throw new InvalidInputError("invoice_not_found");
    }

    const nextStatus = transitionInvoiceStatus(found.status, parseInvoiceStatus(status));
    const now = new Date().toISOString();
    const issuedAt = nextStatus === "ISSUED" && !found.issued_at ? now : found.issued_at;
    const paidAt = nextStatus === "PAID" ? now : found.paid_at;

    db.prepare("UPDATE invoices SET status = ?, issued_at = ?, paid_at = ?, updated_at = ? WHERE id = ?").run(
      nextStatus,
      issuedAt,
      paidAt,
      now,
      invoiceId,
    );
    db.prepare(
      "INSERT INTO invoice_status_history (id, invoice_id, from_status, to_status, note, changed_by, changed_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    ).run(randomUUID(), invoiceId, found.status, nextStatus, note?.trim() || null, actorId, now);

    appendAuditLog(db, {
      actorType: "USER",
      actorId,
      action: "api.commercial.invoice.transition",
      targetType: "invoice",
      requestId,
      metadata: {
        invoiceId,
        fromStatus: found.status,
        toStatus: nextStatus,
      },
    });

    return {
      ...found,
      status: nextStatus,
      issued_at: issuedAt,
      paid_at: paidAt,
      updated_at: now,
    };
  } finally {
    db.close();
  }
};

export const recordPayment = (
  invoiceId: string,
  input: {
    amount_cents: number;
    currency: string;
    paid_at?: string;
    reference?: string;
  },
  actorId: string,
  requestId: string,
): { payment: PaymentRecord; invoice: InvoiceRecord } => {
  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);
  try {
    const invoice = db
      .prepare(
        "SELECT id, proposal_id, intake_request_id, event_id, client_email, amount_cents, currency, status, issued_at, due_at, paid_at, created_by, created_at, updated_at FROM invoices WHERE id = ?",
      )
      .get(invoiceId) as InvoiceRecord | undefined;

    if (!invoice) {
      throw new InvalidInputError("invoice_not_found");
    }

    if (invoice.status === "DRAFT" || invoice.status === "VOID") {
      throw new InvalidInputError("invoice_not_payable");
    }

    const now = new Date().toISOString();
    const payment: PaymentRecord = {
      id: randomUUID(),
      invoice_id: invoiceId,
      amount_cents: normalizeMoney(input.amount_cents),
      currency: normalizeCurrency(input.currency),
      status: "RECORDED",
      paid_at: parseIsoOrNull(input.paid_at) ?? now,
      reference: input.reference?.trim() || null,
      recorded_by: actorId,
      created_at: now,
      updated_at: now,
    };

    if (payment.currency !== invoice.currency) {
      throw new InvalidInputError("payment_currency_mismatch");
    }

    db.prepare(
      `
INSERT INTO payments (id, invoice_id, amount_cents, currency, status, paid_at, reference, recorded_by, created_at, updated_at)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`,
    ).run(
      payment.id,
      payment.invoice_id,
      payment.amount_cents,
      payment.currency,
      payment.status,
      payment.paid_at,
      payment.reference,
      payment.recorded_by,
      payment.created_at,
      payment.updated_at,
    );

    const paidCents = getInvoicePaidCents(db, invoiceId);
    const nextStatus = deriveInvoicePaymentStatus({
      amountCents: invoice.amount_cents,
      paidCents,
      currentStatus: invoice.status,
    });

    const paidAt = nextStatus === "PAID" ? now : invoice.paid_at;
    db.prepare("UPDATE invoices SET status = ?, paid_at = ?, updated_at = ? WHERE id = ?").run(
      nextStatus,
      paidAt,
      now,
      invoiceId,
    );

    if (nextStatus !== invoice.status) {
      db.prepare(
        "INSERT INTO invoice_status_history (id, invoice_id, from_status, to_status, note, changed_by, changed_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      ).run(randomUUID(), invoiceId, invoice.status, nextStatus, "payment recorded", actorId, now);
    }

    appendAuditLog(db, {
      actorType: "USER",
      actorId,
      action: "api.commercial.payment.record",
      targetType: "payment",
      requestId,
      metadata: {
        paymentId: payment.id,
        invoiceId,
        amountCents: payment.amount_cents,
      },
    });

    return {
      payment,
      invoice: {
        ...invoice,
        status: nextStatus,
        paid_at: paidAt,
        updated_at: now,
      },
    };
  } finally {
    db.close();
  }
};

export const getCommercialOverview = () => {
  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);
  try {
    if (!hasCommercialTables(db)) {
      return {
        proposal_count: 0,
        invoice_count: 0,
        payment_count: 0,
        invoiced_cents: 0,
        paid_cents: 0,
        outstanding_cents: 0,
      };
    }

    const proposals = db.prepare("SELECT COUNT(*) AS count FROM proposals").get() as { count: number };
    const invoices = db.prepare("SELECT COUNT(*) AS count FROM invoices").get() as { count: number };
    const payments = db.prepare("SELECT COUNT(*) AS count FROM payments").get() as { count: number };
    const invoiced = db.prepare("SELECT COALESCE(SUM(amount_cents),0) AS total FROM invoices").get() as { total: number };
    const paid = db
      .prepare(
        "SELECT COALESCE(SUM(CASE WHEN status='RECORDED' THEN amount_cents WHEN status='REVERSED' THEN -amount_cents ELSE 0 END),0) AS total FROM payments",
      )
      .get() as { total: number };

    return {
      proposal_count: proposals.count,
      invoice_count: invoices.count,
      payment_count: payments.count,
      invoiced_cents: invoiced.total,
      paid_cents: paid.total,
      outstanding_cents: Math.max(invoiced.total - paid.total, 0),
    };
  } finally {
    db.close();
  }
};
