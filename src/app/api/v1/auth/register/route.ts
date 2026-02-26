import { hal, problem } from "../../../../../lib/api/response";
import {
  EmailAlreadyRegisteredError,
  InvalidRegisterPayloadError,
  InvalidTermsAcknowledgmentError,
  isSameOriginMutation,
  registerUser,
} from "../../../../../lib/api/auth";
import { withRateLimit } from "../../../../../lib/api/rate-limit-wrapper";
import { resolveTransactionalEmailPort } from "../../../../../platform/email";
import { parsePayload } from "../../../../../lib/api/validate";
import { registerSchema } from "../../../../../lib/api/schemas";
import { withRequestLogging } from "../../../../../lib/api/request-logging";
import { getOrCreateReferralCode } from "../../../../../lib/api/referrals";

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

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return problem(
      {
        type: "https://lms-219.dev/problems/invalid-json",
        title: "Bad Request",
        status: 400,
        detail: "Request body must be valid JSON.",
      },
      request,
    );
  }

  const parsed = parsePayload(registerSchema, raw, request);
  if (!parsed.success) return parsed.response;

  if (parsed.data.terms_accepted === false) {
    return problem(
      {
        type: "https://lms-219.dev/problems/invalid-input",
        title: "Bad Request",
        status: 400,
        detail: "Terms and Privacy acknowledgment is required.",
      },
      request,
    );
  }

  try {
    const created = await registerUser(
      parsed.data.email,
      parsed.data.password,
      parsed.data.terms_accepted,
      crypto.randomUUID(),
      resolveTransactionalEmailPort(),
    );
    // Pre-create referral code eagerly so it appears immediately on the dashboard.
    // Non-fatal: code is lazy-created on first dashboard visit if this fails.
    try {
      getOrCreateReferralCode({ userId: created.id, requestId: crypto.randomUUID() });
    } catch (e) {
      console.error("Failed to pre-create referral code at registration:", e);
    }
    return hal(
      {
        id: created.id,
        email: created.email,
        status: created.status,
        roles: created.roles,
      },
      {
        self: { href: "/api/v1/me" },
        login: { href: "/api/v1/auth/login" },
      },
      {
        status: 201,
        headers: {
          "cache-control": "no-store",
        },
      },
    );
  } catch (error) {
    if (error instanceof EmailAlreadyRegisteredError) {
      return problem(
        {
          type: "https://lms-219.dev/problems/conflict",
          title: "Conflict",
          status: 409,
          detail: "Email is already registered.",
        },
        request,
        {
          headers: {
            "cache-control": "no-store",
          },
        },
      );
    }

    if (error instanceof InvalidRegisterPayloadError || error instanceof InvalidTermsAcknowledgmentError) {
      return problem(
        {
          type: "https://lms-219.dev/problems/invalid-input",
          title: "Bad Request",
          status: 400,
          detail: "Invalid registration payload.",
        },
        request,
        {
          headers: {
            "cache-control": "no-store",
          },
        },
      );
    }

    return problem(
      {
        type: "https://lms-219.dev/problems/internal",
        title: "Internal Server Error",
        status: 500,
        detail: "Unable to register user.",
      },
        request,
        {
          headers: {
            "cache-control": "no-store",
          },
        },
    );
  }
}

export const POST = withRequestLogging(withRateLimit("auth:register", _POST));
