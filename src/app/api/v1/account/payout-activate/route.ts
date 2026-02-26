import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getSessionUserFromRequest } from "../../../../../lib/api/auth";
import { hal, problem } from "../../../../../lib/api/response";
import { withRequestLogging } from "../../../../../lib/api/request-logging";
import { openCliDb, appendAuditLog } from "../../../../../platform/runtime";
import { resolveConfig } from "../../../../../platform/config";
import { createStripeConnectOnboardingLinkForUser } from "../../../../../lib/api/stripe-connect";

const schema = z.object({
  legal_name:    z.string().min(2),
  entity_type:   z.enum(["INDIVIDUAL", "LLC", "S_CORP", "C_CORP"]),
  address_line1: z.string().min(3),
  city:          z.string().min(2),
  state:         z.string().min(2),
  postal_code:   z.string().min(3),
  country:       z.string().length(2).default("US"),
});

async function _POST(request: Request) {
  const user = getSessionUserFromRequest(request);
  if (!user) {
    return problem(
      {
        type: "https://lms-219.dev/problems/unauthorized",
        title: "Unauthorized",
        status: 401,
        detail: "Active session required.",
      },
      request,
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return problem(
      {
        type: "https://lms-219.dev/problems/bad-request",
        title: "Bad Request",
        status: 400,
        detail: "Invalid JSON payload.",
      },
      request,
    );
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return problem(
      {
        type: "https://lms-219.dev/problems/validation-error",
        title: "Unprocessable Entity",
        status: 422,
        detail: "Validation failed.",
        errors: parsed.error.issues,
      },
      request,
    );
  }

  const now = new Date().toISOString();
  const requestId = randomUUID();

  const db = openCliDb(resolveConfig({ envVars: process.env }));
  try {
    // Write or update tax info (one record per user)
    db.prepare(
      `INSERT INTO payout_tax_info (id, user_id, legal_name, entity_type, address_line1, city, state, postal_code, country, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         legal_name    = excluded.legal_name,
         entity_type   = excluded.entity_type,
         address_line1 = excluded.address_line1,
         city          = excluded.city,
         state         = excluded.state,
         postal_code   = excluded.postal_code,
         country       = excluded.country,
         updated_at    = excluded.updated_at`,
    ).run(
      randomUUID(),
      user.id,
      parsed.data.legal_name,
      parsed.data.entity_type,
      parsed.data.address_line1,
      parsed.data.city,
      parsed.data.state,
      parsed.data.postal_code,
      parsed.data.country,
      now,
      now,
    );

    appendAuditLog(db, {
      actorType: "USER",
      actorId: user.id,
      action: "api.payout.taxinfo.submit",
      targetType: "user",
      requestId,
      metadata: {
        entity_type: parsed.data.entity_type,
        country: parsed.data.country,
      },
    });
  } finally {
    db.close();
  }

  // Create Stripe Connect onboarding link
  try {
    const origin = new URL(request.url).origin;
    const { url: onboarding_url } = await createStripeConnectOnboardingLinkForUser({
      userId: user.id,
      email: user.email,
      returnUrl: `${origin}/account?stripe_return=1`,
      refreshUrl: `${origin}/account/payout-activate?stripe_refresh=1`,
    });

    return hal(
      { onboarding_url },
      { self: { href: "/api/v1/account/payout-activate" } },
    );
  } catch (err) {
    console.error("Failed to create Stripe Connect onboarding link:", err);
    return problem(
      {
        type: "https://lms-219.dev/problems/stripe-error",
        title: "Stripe Error",
        status: 502,
        detail: "Failed to create Stripe Connect onboarding link. Please try again.",
      },
      request,
    );
  }
}

export const POST = withRequestLogging(_POST);
