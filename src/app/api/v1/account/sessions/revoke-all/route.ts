import {
  getSessionUserFromRequest,
  isSameOriginMutation,
  revokeAllOtherSessions,
} from "../../../../../../lib/api/auth";
import { hal, problem } from "../../../../../../lib/api/response";
import { withRequestLogging } from "../../../../../../lib/api/request-logging";
import { withRateLimit } from "../../../../../../lib/api/rate-limit-wrapper";

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

  const result = revokeAllOtherSessions(user.id, user.sessionId, crypto.randomUUID());

  return hal(
    {
      revoked_count: result.revoked_count,
    },
    {
      self: { href: "/api/v1/account/sessions/revoke-all" },
      sessions: { href: "/api/v1/account/sessions" },
    },
  );
}

export const POST = withRequestLogging(withRateLimit("user:write", _POST));
