import { deleteOwnAccount, getSessionUserFromRequest, isSameOriginMutation } from "../../../../../lib/api/auth";
import { hal, problem } from "../../../../../lib/api/response";
import { parsePayload } from "../../../../../lib/api/validate";
import { deleteAccountSchema } from "../../../../../lib/api/schemas";
import { withRequestLogging } from "../../../../../lib/api/request-logging";
import { withRateLimit } from "../../../../../lib/api/rate-limit-wrapper";

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

  const parsed = parsePayload(deleteAccountSchema, raw, request);
  if (!parsed.success) return parsed.response;

  if (parsed.data.confirm_text !== "DELETE") {
    return problem(
      {
        type: "https://lms-219.dev/problems/precondition-failed",
        title: "Precondition Failed",
        status: 412,
        detail: "Account deletion requires explicit confirmation text 'DELETE'.",
      },
      request,
    );
  }

  try {
    const result = deleteOwnAccount(user.id, crypto.randomUUID());
    return hal(
      result,
      {
        self: { href: "/api/v1/account/delete" },
        register: { href: "/api/v1/auth/register" },
      },
      {
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
        detail: "Unable to process account deletion.",
      },
      request,
    );
  }
}

export const POST = withRequestLogging(withRateLimit("user:write", _POST));
