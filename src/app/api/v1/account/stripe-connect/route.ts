import { randomUUID } from "node:crypto";

import { getSessionUserFromRequest, isSameOriginMutation } from "@/lib/api/auth";
import { hal, problem } from "@/lib/api/response";
import {
  createStripeConnectOnboardingLinkForUser,
  getStripeConnectAccountForUser,
  refreshStripeConnectAccountForUser,
} from "@/lib/api/stripe-connect";
import { withRequestLogging } from "@/lib/api/request-logging";
import { withRateLimit } from "@/lib/api/rate-limit-wrapper";

async function _GET(request: Request) {
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

  try {
    const existing = getStripeConnectAccountForUser(user.id);

    let account = existing;
    if (existing) {
      try {
        account = await refreshStripeConnectAccountForUser({ userId: user.id, requestId: randomUUID() });
      } catch {
        // If Stripe is misconfigured, still allow the UI to display last-known state.
        account = existing;
      }
    }

    return hal(
      {
        status: account?.status ?? "NOT_STARTED",
        stripe_account_id: account?.stripe_account_id ?? null,
        details_submitted: account?.details_submitted ?? null,
        charges_enabled: account?.charges_enabled ?? null,
        payouts_enabled: account?.payouts_enabled ?? null,
        last_checked_at: account?.last_checked_at ?? null,
      },
      {
        self: { href: "/api/v1/account/stripe-connect" },
        me: { href: "/api/v1/me" },
      },
      { headers: { "cache-control": "no-store" } },
    );
  } catch {
    return problem(
      {
        type: "https://lms-219.dev/problems/internal",
        title: "Internal Server Error",
        status: 500,
        detail: "Unable to load Stripe Connect status.",
      },
      request,
    );
  }
}

async function _POST(request: Request) {
  if (!isSameOriginMutation(request)) {
    return problem(
      {
        type: "https://lms-219.dev/problems/csrf-check-failed",
        title: "Forbidden",
        status: 403,
        detail: "Cross-origin mutation request rejected.",
      },
      request,
    );
  }

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

  const origin = new URL(request.url).origin;

  try {
    const result = await createStripeConnectOnboardingLinkForUser({
      userId: user.id,
      email: user.email,
      returnUrl: `${origin}/account`,
      refreshUrl: `${origin}/account`,
    });

    return hal(
      {
        onboarding_url: result.url,
      },
      {
        self: { href: "/api/v1/account/stripe-connect" },
        me: { href: "/api/v1/me" },
      },
      { headers: { "cache-control": "no-store" } },
    );
  } catch {
    return problem(
      {
        type: "https://lms-219.dev/problems/internal",
        title: "Internal Server Error",
        status: 500,
        detail: "Unable to start Stripe Connect onboarding.",
      },
      request,
    );
  }
}

export const GET = withRequestLogging(_GET);
export const POST = withRequestLogging(withRateLimit("user:write", _POST));
