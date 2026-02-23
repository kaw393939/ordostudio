import {
  buildSessionClearCookie,
  getAuthContext,
  isSameOriginMutation,
  logoutUser,
  parseSessionTokenFromCookie,
} from "../../../../../lib/api/auth";
import { hal, problem } from "../../../../../lib/api/response";
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

  const context = getAuthContext();
  const sessionToken = parseSessionTokenFromCookie(request.headers.get("cookie"));

  if (sessionToken) {
    logoutUser(sessionToken, crypto.randomUUID());
  }

  return hal(
    {
      logged_out: true,
    },
    {
      login: { href: "/api/v1/auth/login" },
      register: { href: "/api/v1/auth/register" },
    },
    {
      headers: {
        "set-cookie": buildSessionClearCookie(context.env),
      },
    },
  );
}

export const POST = withRequestLogging(withRateLimit("auth:login", _POST));
