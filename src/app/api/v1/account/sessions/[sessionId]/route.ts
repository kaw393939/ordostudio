import {
  getSessionUserFromRequest,
  isSameOriginMutation,
  revokeSpecificSession,
} from "../../../../../../lib/api/auth";
import { problem } from "../../../../../../lib/api/response";
import { withRequestLogging } from "../../../../../../lib/api/request-logging";
import { withRateLimit } from "../../../../../../lib/api/rate-limit-wrapper";

async function _DELETE(request: Request, context: { params: Promise<{ sessionId: string }> }) {
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

  const { sessionId } = await context.params;

  const result = revokeSpecificSession(user.id, sessionId, user.sessionId, crypto.randomUUID());

  if (!result.revoked) {
    if (result.error === "cannot_revoke_current") {
      return problem(
        {
          type: "https://lms-219.dev/problems/cannot-revoke-current-session",
          title: "Conflict",
          status: 409,
          detail: "Cannot revoke your current session. Use logout instead.",
        },
        request,
      );
    }

    return problem(
      {
        type: "https://lms-219.dev/problems/session-not-found",
        title: "Not Found",
        status: 404,
        detail: "Session not found or already revoked.",
      },
      request,
    );
  }

  return new Response(null, { status: 204 });
}

export const DELETE = withRequestLogging(withRateLimit("user:write", _DELETE));
