import { getUserFromSession, parseSessionTokenFromCookie } from "../../../../lib/api/auth";
import { listAuditEntries } from "../../../../lib/api/audit";
import { getUserById } from "../../../../lib/api/users";
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

  const sessionUser = getUserFromSession(sessionToken);
  if (!sessionUser) {
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

  const user = getUserById(sessionUser.id);

  const links: Record<string, { href: string }> = {
    self: { href: "/api/v1/me" },
    logout: { href: "/api/v1/auth/logout" },
    events: { href: "/api/v1/events" },
    terms: { href: "/terms" },
    privacy: { href: "/privacy" },
    account_delete: { href: "/api/v1/account/delete" },
  };

  if (user.roles.includes("SUPER_ADMIN")) {
    links.users = { href: "/api/v1/users" };
  }

  if (user.roles.some(role => ["ADMIN", "SUPER_ADMIN", "MAESTRO"].includes(role))) {
    links.admin = { href: "/admin" };
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
      display_name: user.display_name,
      bio: user.bio,
      profile_picture_url: user.profile_picture_url,
      last_login_at: lastLogin ?? null,
    },
    links,
  );
}

export const GET = withRequestLogging(_GET);
