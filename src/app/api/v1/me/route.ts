import { getUserFromSession, parseSessionTokenFromCookie } from "../../../../lib/api/auth";
import { listAuditEntries } from "../../../../lib/api/audit";
import { hal, problem } from "../../../../lib/api/response";
import { withRequestLogging } from "../../../../lib/api/request-logging";

async function _GET(request: Request) {
  const sessionToken = parseSessionTokenFromCookie(request.headers.get("cookie"));
  if (!sessionToken) {
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

  const user = getUserFromSession(sessionToken);
  if (!user) {
    return problem(
      {
        type: "https://lms-219.dev/problems/unauthorized",
        title: "Unauthorized",
        status: 401,
        detail: "Session is invalid or expired.",
      },
      request,
    );
  }

  const links: Record<string, { href: string }> = {
    self: { href: "/api/v1/me" },
    logout: { href: "/api/v1/auth/logout" },
    events: { href: "/api/v1/events" },
    terms: { href: "/terms" },
    privacy: { href: "/privacy" },
    account_delete: { href: "/api/v1/account/delete" },
  };

  if (user.roles.includes("ADMIN") || user.roles.includes("SUPER_ADMIN")) {
    links.users = { href: "/api/v1/users" };
  }

  const lastLogin = listAuditEntries({
    action: "api.auth.login",
    actor_id: user.id,
    limit: 1,
    offset: 0,
  }).items[0]?.created_at;

  return hal(
    {
      id: user.id,
      email: user.email,
      status: user.status,
      roles: user.roles,
      last_login_at: lastLogin ?? null,
    },
    links,
  );
}

export const GET = withRequestLogging(_GET);
