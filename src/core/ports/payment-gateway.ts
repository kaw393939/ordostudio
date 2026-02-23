/**
 * Payment Gateway Port
 *
 * Abstraction over external payment processing (Stripe today).
 * Lives in core/ports so use-cases can depend on it without
 * importing infrastructure code.
 *
 * Three logical sub-surfaces:
 *  1. Checkout — create sessions, verify webhooks, issue refunds
 *  2. Connect — onboard merchant accounts
 *  3. Transfers — pay out to connected accounts
 */

/* ── shared types ──────────────────────────────────── */

export interface CheckoutSessionResult {
  id: string;
  url: string | null;
  paymentIntentId: string | null;
  metadata: Record<string, string> | null;
}

export interface RefundResult {
  id: string;
  status: string | null;
}

export interface WebhookEvent {
  id: string;
  type: string;
  data: { object: unknown };
}

export interface ConnectAccount {
  id: string;
  detailsSubmitted: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
}

export interface TransferResult {
  id: string;
}

/* ── port interface ────────────────────────────────── */

export interface PaymentGateway {
  /* ── checkout ── */
  createCheckoutSession(input: {
    successUrl: string;
    cancelUrl: string;
    currency: string;
    amountCents: number;
    description: string;
    metadata: Record<string, string>;
  }): Promise<CheckoutSessionResult>;

  createRefund(input: {
    paymentIntentId: string;
    amountCents?: number;
    reason?: "duplicate" | "fraudulent" | "requested_by_customer";
    metadata?: Record<string, string>;
  }): Promise<RefundResult>;

  constructWebhookEvent(input: {
    payload: string;
    signature: string;
  }): WebhookEvent;

  /* ── connect ── */
  createConnectAccount(input: {
    email?: string | null;
    country?: string;
  }): Promise<{ id: string }>;

  createConnectAccountLink(input: {
    accountId: string;
    refreshUrl: string;
    returnUrl: string;
  }): Promise<{ url: string }>;

  retrieveConnectAccount(input: {
    accountId: string;
  }): Promise<ConnectAccount>;

  /* ── transfers ── */
  createTransfer(input: {
    amountCents: number;
    currency: string;
    destinationAccountId: string;
    idempotencyKey: string;
    transferGroup?: string;
    metadata?: Record<string, string>;
  }): Promise<TransferResult>;
}
