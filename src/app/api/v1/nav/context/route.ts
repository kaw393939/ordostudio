import { getUserFromSession, parseSessionTokenFromCookie } from "../../../../../lib/api/auth";
import { hal } from "../../../../../lib/api/response";
import { withRequestLogging } from "../../../../../lib/api/request-logging";

type Audience = "guest" | "user" | "admin";

type NavContext = {
  audience: Audience;
  roles: string[];
};

const resolveContext = (request: Request): NavContext => {
  const sessionToken = parseSessionTokenFromCookie(request.headers.get("cookie"));
  if (!sessionToken) {
    return { audience: "guest", roles: [] };
  }

  const user = getUserFromSession(sessionToken);
  if (!user) {
    return { audience: "guest", roles: [] };
  }

  const roles = [...(user.roles ?? [])];

  if (user.roles.includes("ADMIN") || user.roles.includes("SUPER_ADMIN") || user.roles.includes("MAESTRO")) {
    return { audience: "admin", roles };
  }

  return { audience: "user", roles };
};

async function _GET(request: Request) {
  const context = resolveContext(request);

  return hal(
    context,
    {
      self: { href: "/api/v1/nav/context" },
      root: { href: "/api/v1" },
    },
  );
}

export const GET = withRequestLogging(_GET);
