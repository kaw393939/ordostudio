import { withRateLimit } from "../../../../../../lib/api/rate-limit-wrapper";
import { hal, problem } from "../../../../../../lib/api/response";
import { isSameOriginMutation, requestPasswordReset } from "../../../../../../lib/api/auth";
import { resolveTransactionalEmailPort } from "../../../../../../platform/email";
import { parsePayload } from "../../../../../../lib/api/validate";
import { passwordResetRequestSchema } from "../../../../../../lib/api/schemas";
import { withRequestLogging } from "../../../../../../lib/api/request-logging";

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

  const parsed = parsePayload(passwordResetRequestSchema, raw, request);
  if (!parsed.success) return parsed.response;

  try {
    const result = requestPasswordReset(parsed.data.email, crypto.randomUUID(), resolveTransactionalEmailPort());
    return hal(
      {
        accepted: true,
        ...(result.token ? { reset_token: result.token } : {}),
      },
      {
        self: { href: "/api/v1/auth/password-reset/request" },
        confirm: { href: "/api/v1/auth/password-reset/confirm" },
      },
      {
        status: 202,
        headers: {
          "cache-control": "no-store",
        },
      },
    );
  } catch {
    return problem(
      {
        type: "https://lms-219.dev/problems/internal",
        title: "Internal Server Error",
        status: 500,
        detail: "Unable to process password reset request.",
      },
      request,
    );
  }
}

export const POST = withRequestLogging(withRateLimit("auth:password-reset", _POST));
