/**
 * In-memory fake PaymentGateway for tests.
 *
 * Deterministic — no network, no secrets. Records every call so
 * tests can assert on invocations and configure per-call responses.
 */
import type {
  PaymentGateway,
  CheckoutSessionResult,
  RefundResult,
  WebhookEvent,
  ConnectAccount,
  TransferResult,
} from "@/core/ports/payment-gateway";

/* ── call records ──────────────────────────────────── */

export interface CheckoutCall {
  successUrl: string;
  cancelUrl: string;
  currency: string;
  amountCents: number;
  description: string;
  metadata: Record<string, string>;
}

export interface RefundCall {
  paymentIntentId: string;
  amountCents?: number;
  reason?: string;
  metadata?: Record<string, string>;
}

export interface TransferCall {
  amountCents: number;
  currency: string;
  destinationAccountId: string;
  idempotencyKey: string;
  transferGroup?: string;
  metadata?: Record<string, string>;
}

/* ── fake implementation ───────────────────────────── */

export class FakePaymentGateway implements PaymentGateway {
  /* Spied calls */
  checkoutCalls: CheckoutCall[] = [];
  refundCalls: RefundCall[] = [];
  webhookCalls: { payload: string; signature: string }[] = [];
  connectAccountCalls: { email?: string | null; country?: string }[] = [];
  connectLinkCalls: { accountId: string; refreshUrl: string; returnUrl: string }[] = [];
  retrieveConnectCalls: { accountId: string }[] = [];
  transferCalls: TransferCall[] = [];

  /* Configurable responses */
  nextCheckoutSession: CheckoutSessionResult = {
    id: "cs_fake_1",
    url: "https://fake.stripe/checkout/cs_fake_1",
    paymentIntentId: "pi_fake_1",
    metadata: null,
  };

  nextRefund: RefundResult = { id: "re_fake_1", status: "succeeded" };

  nextWebhookEvent: WebhookEvent = {
    id: "evt_fake_1",
    type: "checkout.session.completed",
    data: { object: {} },
  };

  nextConnectAccount: { id: string } = { id: "acct_fake_1" };

  nextConnectAccountLink: { url: string } = {
    url: "https://fake.stripe/connect/acct_fake_1",
  };

  nextRetrievedAccount: ConnectAccount = {
    id: "acct_fake_1",
    detailsSubmitted: true,
    chargesEnabled: true,
    payoutsEnabled: true,
  };

  nextTransfer: TransferResult = { id: "tr_fake_1" };

  /* Optional error injection */
  errorToThrow: Error | null = null;

  private maybeThrow(): void {
    if (this.errorToThrow) throw this.errorToThrow;
  }

  /* ── checkout ── */

  async createCheckoutSession(input: CheckoutCall): Promise<CheckoutSessionResult> {
    this.maybeThrow();
    this.checkoutCalls.push(input);
    return this.nextCheckoutSession;
  }

  async createRefund(input: RefundCall): Promise<RefundResult> {
    this.maybeThrow();
    this.refundCalls.push(input);
    return this.nextRefund;
  }

  constructWebhookEvent(input: { payload: string; signature: string }): WebhookEvent {
    this.maybeThrow();
    this.webhookCalls.push(input);
    return this.nextWebhookEvent;
  }

  /* ── connect ── */

  async createConnectAccount(input: { email?: string | null; country?: string }): Promise<{ id: string }> {
    this.maybeThrow();
    this.connectAccountCalls.push(input);
    return this.nextConnectAccount;
  }

  async createConnectAccountLink(input: {
    accountId: string;
    refreshUrl: string;
    returnUrl: string;
  }): Promise<{ url: string }> {
    this.maybeThrow();
    this.connectLinkCalls.push(input);
    return this.nextConnectAccountLink;
  }

  async retrieveConnectAccount(input: { accountId: string }): Promise<ConnectAccount> {
    this.maybeThrow();
    this.retrieveConnectCalls.push(input);
    return this.nextRetrievedAccount;
  }

  /* ── transfers ── */

  async createTransfer(input: TransferCall): Promise<TransferResult> {
    this.maybeThrow();
    this.transferCalls.push(input);
    return this.nextTransfer;
  }

  /* ── helpers ── */

  reset(): void {
    this.checkoutCalls = [];
    this.refundCalls = [];
    this.webhookCalls = [];
    this.connectAccountCalls = [];
    this.connectLinkCalls = [];
    this.retrieveConnectCalls = [];
    this.transferCalls = [];
    this.errorToThrow = null;
  }
}
