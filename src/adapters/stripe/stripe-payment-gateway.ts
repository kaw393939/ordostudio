/**
 * Stripe adapter implementing the PaymentGateway port.
 *
 * Thin wrapper around the existing stripe-client functions that maps
 * the concrete Stripe SDK types to the port's delivery-neutral types.
 */
import type {
  PaymentGateway,
  CheckoutSessionResult,
  RefundResult,
  WebhookEvent,
  ConnectAccount,
  TransferResult,
} from "@/core/ports/payment-gateway";
import * as stripeClient from "@/adapters/stripe/stripe-client";

export class StripePaymentGateway implements PaymentGateway {
  /* ── checkout ── */

  async createCheckoutSession(input: {
    successUrl: string;
    cancelUrl: string;
    currency: string;
    amountCents: number;
    description: string;
    metadata: Record<string, string>;
  }): Promise<CheckoutSessionResult> {
    const session = await stripeClient.createCheckoutSession(input);
    return {
      id: session.id,
      url: session.url,
      paymentIntentId: session.payment_intent,
      metadata: session.metadata ?? null,
    };
  }

  async createRefund(input: {
    paymentIntentId: string;
    amountCents?: number;
    reason?: "duplicate" | "fraudulent" | "requested_by_customer";
    metadata?: Record<string, string>;
  }): Promise<RefundResult> {
    return stripeClient.createRefund(input);
  }

  constructWebhookEvent(input: {
    payload: string;
    signature: string;
  }): WebhookEvent {
    const event = stripeClient.constructWebhookEvent(input);
    return {
      id: event.id,
      type: event.type,
      data: { object: event.data.object },
    };
  }

  /* ── connect ── */

  async createConnectAccount(input: {
    email?: string | null;
    country?: string;
  }): Promise<{ id: string }> {
    return stripeClient.createConnectAccount(input);
  }

  async createConnectAccountLink(input: {
    accountId: string;
    refreshUrl: string;
    returnUrl: string;
  }): Promise<{ url: string }> {
    return stripeClient.createConnectAccountLink(input);
  }

  async retrieveConnectAccount(input: {
    accountId: string;
  }): Promise<ConnectAccount> {
    const acct = await stripeClient.retrieveConnectAccount(input);
    return {
      id: acct.id,
      detailsSubmitted: acct.details_submitted,
      chargesEnabled: acct.charges_enabled,
      payoutsEnabled: acct.payouts_enabled,
    };
  }

  /* ── transfers ── */

  async createTransfer(input: {
    amountCents: number;
    currency: string;
    destinationAccountId: string;
    idempotencyKey: string;
    transferGroup?: string;
    metadata?: Record<string, string>;
  }): Promise<TransferResult> {
    return stripeClient.createTransfer(input);
  }
}
