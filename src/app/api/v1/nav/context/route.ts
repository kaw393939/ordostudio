import { getUserFromSession, parseSessionTokenFromCookie } from "../../../../../lib/api/auth";
import { hal } from "../../../../../lib/api/response";
import { withRequestLogging } from "../../../../../lib/api/request-logging";

type Audience = "guest" | "user" | "admin";

const resolveAudience = (request: Request): Audience => {
  const sessionToken = parseSessionTokenFromCookie(request.headers.get("cookie"));
  if (!sessionToken) {
    return "guest";
  }

  const user = getUserFromSession(sessionToken);
  if (!user) {
    return "guest";
  }

  if (user.roles.includes("ADMIN") || user.roles.includes("SUPER_ADMIN")) {
    return "admin";
  }

  return "user";
};

async function _GET(request: Request) {
  const audience = resolveAudience(request);

  return hal(
    {
      audience,
    },
    {
      self: { href: "/api/v1/nav/context" },
      root: { href: "/api/v1" },
    },
  );
}

export const GET = withRequestLogging(_GET);
