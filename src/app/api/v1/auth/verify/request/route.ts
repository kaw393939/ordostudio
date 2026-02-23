import { withRateLimit } from "../../../../../../lib/api/rate-limit-wrapper";
import { hal, problem } from "../../../../../../lib/api/response";
import { isSameOriginMutation, requestEmailVerification } from "../../../../../../lib/api/auth";
import { resolveTransactionalEmailPort } from "../../../../../../platform/email";
import { parsePayload } from "../../../../../../lib/api/validate";
import { verifyRequestSchema } from "../../../../../../lib/api/schemas";
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

  const parsed = parsePayload(verifyRequestSchema, raw, request);
  if (!parsed.success) return parsed.response;

  const result = requestEmailVerification(parsed.data.email, crypto.randomUUID(), resolveTransactionalEmailPort());
  return hal(
    {
      accepted: true,
      ...(result.token ? { verification_token: result.token } : {}),
    },
    {
      self: { href: "/api/v1/auth/verify/request" },
      confirm: { href: "/api/v1/auth/verify/confirm" },
    },
    {
      status: 202,
      headers: {
        "cache-control": "no-store",
      },
    },
  );
}

export const POST = withRequestLogging(withRateLimit("auth:verify", _POST));
