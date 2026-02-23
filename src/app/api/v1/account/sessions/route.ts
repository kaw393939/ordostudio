import {
  getSessionUserFromRequest,
  listSessionsForUser,
} from "../../../../../lib/api/auth";
import { hal, problem } from "../../../../../lib/api/response";
import { withRequestLogging } from "../../../../../lib/api/request-logging";
import { withRateLimit } from "../../../../../lib/api/rate-limit-wrapper";

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

  const sessions = listSessionsForUser(user.id, user.sessionId);

  return hal(
    { sessions },
    {
      self: { href: "/api/v1/account/sessions" },
      revoke_all: { href: "/api/v1/account/sessions/revoke-all" },
    },
  );
}

export const GET = withRequestLogging(withRateLimit("user:write", _GET));
