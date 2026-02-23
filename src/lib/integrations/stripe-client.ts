import Stripe from "stripe";

export type StripeCheckoutSession = {
  id: string;
  url: string | null;
  payment_intent: string | null;
  metadata?: Record<string, string> | null;
};

export type StripeWebhookEvent = {
  id: string;
  type: string;
  data: {
    object: unknown;
  };
};

export type StripeConnectAccount = {
  id: string;
  details_submitted: boolean;
  charges_enabled: boolean;
  payouts_enabled: boolean;
};

const requireSecretKey = (): string => {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || key.trim().length === 0) {
    throw new Error("stripe_secret_key_missing");
  }
  return key;
};

const stripeClient = (): Stripe => {
  const key = requireSecretKey();
  return new Stripe(key);
};

export const createCheckoutSession = async (input: {
  successUrl: string;
  cancelUrl: string;
  currency: string;
  amountCents: number;
  description: string;
  metadata: Record<string, string>;
}): Promise<StripeCheckoutSession> => {
  const stripe = stripeClient();

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: input.currency.toLowerCase(),
          unit_amount: input.amountCents,
          product_data: {
            name: input.description,
          },
        },
      },
    ],
    metadata: input.metadata,
  });

  return {
    id: session.id,
    url: session.url,
    payment_intent: typeof session.payment_intent === "string" ? session.payment_intent : null,
    metadata: session.metadata,
  };
};

export const createRefund = async (input: {
  paymentIntentId: string;
  amountCents?: number;
  reason?: "duplicate" | "fraudulent" | "requested_by_customer";
  metadata?: Record<string, string>;
}): Promise<{ id: string; status: string | null }> => {
  const stripe = stripeClient();

  const refund = await stripe.refunds.create({
    payment_intent: input.paymentIntentId,
    amount: input.amountCents,
    reason: input.reason,
    metadata: input.metadata,
  });

  return {
    id: refund.id,
    status: refund.status ?? null,
  };
};

export const constructWebhookEvent = (input: {
  payload: string;
  signature: string;
}): StripeWebhookEvent => {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || secret.trim().length === 0) {
    throw new Error("stripe_webhook_secret_missing");
  }

  const stripe = stripeClient();
  const event = stripe.webhooks.constructEvent(input.payload, input.signature, secret) as Stripe.Event;

  return {
    id: event.id,
    type: event.type,
    data: {
      object: event.data.object as unknown,
    },
  };
};

export const createConnectAccount = async (input: {
  email?: string | null;
  country?: string;
}): Promise<{ id: string }> => {
  const stripe = stripeClient();

  const account = await stripe.accounts.create({
    type: "express",
    country: input.country ?? process.env.STRIPE_CONNECT_COUNTRY ?? "US",
    email: input.email ?? undefined,
  });

  return { id: account.id };
};

export const createConnectAccountLink = async (input: {
  accountId: string;
  refreshUrl: string;
  returnUrl: string;
}): Promise<{ url: string }> => {
  const stripe = stripeClient();

  const link = await stripe.accountLinks.create({
    account: input.accountId,
    refresh_url: input.refreshUrl,
    return_url: input.returnUrl,
    type: "account_onboarding",
  });

  return { url: link.url };
};

export const retrieveConnectAccount = async (input: {
  accountId: string;
}): Promise<StripeConnectAccount> => {
  const stripe = stripeClient();
  const account = (await stripe.accounts.retrieve(input.accountId)) as Stripe.Account;

  return {
    id: account.id,
    details_submitted: account.details_submitted,
    charges_enabled: account.charges_enabled,
    payouts_enabled: account.payouts_enabled,
  };
};

export const createTransfer = async (input: {
  amountCents: number;
  currency: string;
  destinationAccountId: string;
  idempotencyKey: string;
  transferGroup?: string;
  metadata?: Record<string, string>;
}): Promise<{ id: string }> => {
  const stripe = stripeClient();

  const transfer = await stripe.transfers.create(
    {
      amount: input.amountCents,
      currency: input.currency.toLowerCase(),
      destination: input.destinationAccountId,
      transfer_group: input.transferGroup,
      metadata: input.metadata,
    },
    { idempotencyKey: input.idempotencyKey },
  );

  return { id: transfer.id };
};
