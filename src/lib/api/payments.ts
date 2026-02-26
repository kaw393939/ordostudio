import { randomUUID } from "node:crypto";
import { openCliDb, appendAuditLog } from "@/platform/runtime";
import { resolveConfig } from "@/platform/config";
import { transitionDealStatus } from "@/lib/api/deals";
import { recordReferralConversionForDeal } from "@/lib/api/referrals";
import { constructWebhookEvent, createCheckoutSession, createRefund } from "@/adapters/stripe/stripe-client";

export type PaymentProvider = "STRIPE";
export type PaymentStatus = "CREATED" | "PAID" | "REFUNDED" | "FAILED";

export type PaymentRecord = {
  id: string;
  deal_id: string;
  provider: PaymentProvider;
  checkout_session_id: string | null;
  payment_intent_id: string | null;
  status: PaymentStatus;
  amount_cents: number;
  currency: string;
  created_at: string;
  updated_at: string;
};

export class PaymentNotFoundError extends Error {
  constructor(public readonly dealId: string) {
    super(`Payment not found for deal: ${dealId}`);
    this.name = "PaymentNotFoundError";
  }
}

export class PaymentPreconditionError extends Error {
  constructor(
    public readonly reason:
      | "deal_missing"
      | "offer_missing"
      | "offer_inactive"
      | "pricing_missing"
      | "payment_missing_intent"
      | "payment_not_paid"
      | "confirm_required",
  ) {
    super(`Payment precondition failed: ${reason}`);
    this.name = "PaymentPreconditionError";
  }
}

export class PaymentConflictError extends Error {
  constructor(
    public readonly reason:
      | "already_paid"
      | "already_refunded"
      | "checkout_in_progress",
  ) {
    super(`Payment conflict: ${reason}`);
    this.name = "PaymentConflictError";
  }
}

const loadDealWithOffer = (db: ReturnType<typeof openCliDb>, dealId: string) => {
  return db
    .prepare(
      `
SELECT d.id as deal_id,
       d.status as deal_status,
       d.offer_slug as offer_slug,
       o.title as offer_title,
       o.status as offer_status,
       o.price_cents as price_cents,
       o.currency as currency,
       o.duration_label as duration_label
FROM deals d
LEFT JOIN offers o ON o.slug = d.offer_slug
WHERE d.id = ?
`,
    )
    .get(dealId) as
    | {
        deal_id: string;
        deal_status: string;
        offer_slug: string | null;
        offer_title: string | null;
        offer_status: "ACTIVE" | "INACTIVE" | null;
        price_cents: number | null;
        currency: string | null;
        duration_label: string | null;
      }
    | undefined;
};

const loadLatestPayment = (db: ReturnType<typeof openCliDb>, dealId: string): PaymentRecord | null => {
  const row = db
    .prepare(
      "SELECT id, deal_id, provider, checkout_session_id, payment_intent_id, status, amount_cents, currency, created_at, updated_at FROM deal_payments WHERE deal_id = ? ORDER BY created_at DESC LIMIT 1",
    )
    .get(dealId) as PaymentRecord | undefined;
  return row ?? null;
};

export const createStripeCheckoutForDeal = async (input: {
  dealId: string;
  actorId: string;
  requestId: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<{ payment: PaymentRecord; checkoutUrl: string }> => {
  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);

  try {
    const deal = loadDealWithOffer(db, input.dealId);
    if (!deal) {
      throw new PaymentPreconditionError("deal_missing");
    }

    if (!deal.offer_slug || !deal.offer_title) {
      throw new PaymentPreconditionError("offer_missing");
    }

    if (deal.offer_status !== "ACTIVE") {
      throw new PaymentPreconditionError("offer_inactive");
    }

    if (!deal.price_cents || !deal.currency) {
      throw new PaymentPreconditionError("pricing_missing");
    }

    const existing = loadLatestPayment(db, input.dealId);
    if (existing?.status === "PAID") {
      throw new PaymentConflictError("already_paid");
    }
    if (existing?.status === "REFUNDED") {
      throw new PaymentConflictError("already_refunded");
    }
    // If a checkout is already in progress, do not start another.
    // The UNIQUE index on deal_payments(deal_id) WHERE status='CREATED'
    // enforces this at the DB level; this guard provides the domain error.
    if (existing?.status === "CREATED") {
      throw new PaymentConflictError("checkout_in_progress");
    }

    const now = new Date().toISOString();
    const paymentId = randomUUID();

    try {
      db.prepare(
        `
INSERT INTO deal_payments (
  id, deal_id, provider, checkout_session_id, payment_intent_id, status, amount_cents, currency, created_at, updated_at
) VALUES (?, ?, 'STRIPE', NULL, NULL, 'CREATED', ?, ?, ?, ?)
`,
    ).run(paymentId, input.dealId, deal.price_cents, deal.currency, now, now);
    } catch (insertErr: unknown) {
      if (
        insertErr instanceof Error &&
        insertErr.message.includes("UNIQUE constraint failed")
      ) {
        // Concurrent request already created a CREATED record for this deal.
        throw new PaymentConflictError("checkout_in_progress");
      }
      throw insertErr;
    }

    const session = await createCheckoutSession({
      successUrl: input.successUrl,
      cancelUrl: input.cancelUrl,
      currency: deal.currency,
      amountCents: deal.price_cents,
      description: `${deal.offer_title}${deal.duration_label ? ` (${deal.duration_label})` : ""}`,
      metadata: {
        deal_id: input.dealId,
        payment_id: paymentId,
      },
    });

    db.prepare("UPDATE deal_payments SET checkout_session_id = ?, payment_intent_id = ?, updated_at = ? WHERE id = ?").run(
      session.id,
      session.payment_intent,
      new Date().toISOString(),
      paymentId,
    );

    appendAuditLog(db, {
      actorType: "USER",
      actorId: input.actorId,
      action: "api.payment.checkout.create",
      targetType: "payment",
      requestId: input.requestId,
      metadata: {
        dealId: input.dealId,
        paymentId,
        checkoutSessionId: session.id,
      },
    });

    const payment = db
      .prepare(
        "SELECT id, deal_id, provider, checkout_session_id, payment_intent_id, status, amount_cents, currency, created_at, updated_at FROM deal_payments WHERE id = ?",
      )
      .get(paymentId) as PaymentRecord;

    return { payment, checkoutUrl: session.url ?? "" };
  } finally {
    db.close();
  }
};

export const handleStripeWebhook = async (input: {
  payload: string;
  signature: string;
  requestId: string;
}): Promise<{ processed: boolean; duplicate: boolean }> => {
  const event = constructWebhookEvent({ payload: input.payload, signature: input.signature });

  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);

  try {
    const existing = db
      .prepare("SELECT status FROM stripe_webhook_events WHERE stripe_event_id = ?")
      .get(event.id) as { status: "RECEIVED" | "PROCESSED" | "FAILED" } | undefined;

    if (existing?.status === "PROCESSED") {
      return { processed: false, duplicate: true };
    }

    const now = new Date().toISOString();

    if (!existing) {
      db.prepare(
        `
INSERT INTO stripe_webhook_events (
  id, provider, stripe_event_id, event_type, received_at, processed_at, status, error_message
) VALUES (?, 'STRIPE', ?, ?, ?, NULL, 'RECEIVED', NULL)
`,
      ).run(randomUUID(), event.id, event.type, now);
    }

    try {
      if (event.type === "charge.refunded") {
        // Policy rule 8: void EARNED/APPROVED commissions when Stripe issues a
        // refund directly (e.g., via the Stripe dashboard or dispute handler).
        // The Stripe Charge object carries the payment_intent ID we can reverse-lookup.
        const charge = event.data.object as { id: string; payment_intent?: string | null };
        const paymentIntentId = charge.payment_intent;

        if (paymentIntentId) {
          const payment = db
            .prepare("SELECT deal_id FROM deal_payments WHERE payment_intent_id = ?")
            .get(paymentIntentId) as { deal_id: string } | undefined;

          if (payment?.deal_id) {
            const voidedAt = new Date().toISOString();
            db.transaction(() => {
              db.prepare(
                `UPDATE ledger_entries
                 SET status = 'VOID', updated_at = ?
                 WHERE deal_id = ?
                   AND entry_type IN ('REFERRER_COMMISSION', 'PLATFORM_REVENUE')
                   AND status IN ('EARNED', 'APPROVED')`,
              ).run(voidedAt, payment.deal_id);
            })();
          }
        }
      }

      if (event.type === "checkout.session.completed") {
        const session = event.data.object as {
          id: string;
          payment_intent?: string | null;
          metadata?: Record<string, string> | null;
        };

        const paymentId = session.metadata?.payment_id;
        const dealId = session.metadata?.deal_id;

        if (!paymentId || !dealId) {
          throw new Error("missing_metadata");
        }

        const payment = db
          .prepare(
            "SELECT id, deal_id, provider, checkout_session_id, payment_intent_id, status, amount_cents, currency, created_at, updated_at FROM deal_payments WHERE id = ?",
          )
          .get(paymentId) as PaymentRecord | undefined;

        if (!payment) {
          throw new Error("payment_not_found");
        }

        if (payment.status !== "PAID") {
          db.prepare("UPDATE deal_payments SET status = 'PAID', payment_intent_id = ?, checkout_session_id = ?, updated_at = ? WHERE id = ?").run(
            session.payment_intent ?? null,
            session.id,
            new Date().toISOString(),
            paymentId,
          );

          transitionDealStatus(db, {
            dealId,
            toStatus: "PAID",
            note: "Stripe payment confirmed",
            actor: { type: "SERVICE", id: null },
            requestId: input.requestId,
            enforceGate: false,
          });

          // Record the deal-paid referral conversion (idempotent).
          try {
            recordReferralConversionForDeal({ dealId, requestId: input.requestId });
          } catch {
            // Non-blocking — payment is already confirmed.
          }

          appendAuditLog(db, {
            actorType: "SERVICE",
            actorId: null,
            action: "stripe.webhook.payment.paid",
            targetType: "payment",
            requestId: input.requestId,
            metadata: { stripeEventId: event.id, dealId, paymentId },
          });
        }
      }

      db.prepare("UPDATE stripe_webhook_events SET processed_at = ?, status = 'PROCESSED', error_message = NULL WHERE stripe_event_id = ?").run(
        new Date().toISOString(),
        event.id,
      );

      return { processed: true, duplicate: false };
    } catch (error) {
      db.prepare("UPDATE stripe_webhook_events SET processed_at = ?, status = 'FAILED', error_message = ? WHERE stripe_event_id = ?").run(
        new Date().toISOString(),
        error instanceof Error ? error.message : "unknown",
        event.id,
      );
      throw error;
    }
  } finally {
    db.close();
  }
};

export const refundDealPaymentAdmin = async (input: {
  dealId: string;
  actorId: string;
  requestId: string;
  reason: string;
  confirm: boolean;
}): Promise<{ payment: PaymentRecord }> => {
  if (!input.confirm) {
    throw new PaymentPreconditionError("confirm_required");
  }

  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);

  try {
    const payment = loadLatestPayment(db, input.dealId);
    if (!payment) {
      throw new PaymentNotFoundError(input.dealId);
    }

    if (payment.status === "REFUNDED") {
      throw new PaymentConflictError("already_refunded");
    }

    // Only PAID payments can be refunded; CREATED means checkout was never completed.
    if (payment.status !== "PAID") {
      throw new PaymentPreconditionError("payment_not_paid");
    }

    if (!payment.payment_intent_id) {
      throw new PaymentPreconditionError("payment_missing_intent");
    }

    await createRefund({
      paymentIntentId: payment.payment_intent_id,
      reason: "requested_by_customer",
      metadata: {
        deal_id: input.dealId,
        payment_id: payment.id,
        reason: input.reason,
      },
    });

    const now = new Date().toISOString();
    db.prepare("UPDATE deal_payments SET status = 'REFUNDED', updated_at = ? WHERE id = ?").run(now, payment.id);

    transitionDealStatus(db, {
      dealId: input.dealId,
      toStatus: "REFUNDED",
      note: `Refund issued: ${input.reason}`,
      actor: { type: "USER", id: input.actorId },
      requestId: input.requestId,
      enforceGate: false,
    });

    appendAuditLog(db, {
      actorType: "USER",
      actorId: input.actorId,
      action: "api.payment.refund",
      targetType: "payment",
      requestId: input.requestId,
      metadata: { dealId: input.dealId, paymentId: payment.id },
    });

    // Policy rule 8: void any EARNED or APPROVED referral commissions on refund.
    const refundedAt = new Date().toISOString();
    db.prepare(
      `UPDATE ledger_entries SET status = 'VOID', updated_at = ?
       WHERE deal_id = ? AND entry_type = 'REFERRER_COMMISSION' AND status IN ('EARNED', 'APPROVED')`,
    ).run(refundedAt, input.dealId);

    const updated = loadLatestPayment(db, input.dealId);
    if (!updated) {
      throw new PaymentNotFoundError(input.dealId);
    }

    return { payment: updated };
  } finally {
    db.close();
  }
};
