import { getSessionUserFromRequest } from "../../../../../lib/api/auth";
import { hal, problem } from "../../../../../lib/api/response";
import { withRequestLogging } from "../../../../../lib/api/request-logging";
import { listRoleRequests } from "../../../../../lib/api/roles";

const requireAdmin = (request: Request) => {
  const user = getSessionUserFromRequest(request);
  if (!user) {
    return {
      error: problem(
        {
          type: "https://lms-219.dev/problems/unauthorized",
          title: "Unauthorized",
          status: 401,
          detail: "Active session required.",
        },
        request,
      ),
    };
  }

  if (!user.roles.includes("SUPER_ADMIN") && !user.roles.includes("ADMIN")) {
    return {
      error: problem(
        {
          type: "https://lms-219.dev/problems/forbidden",
          title: "Forbidden",
          status: 403,
          detail: "Admin role required.",
        },
        request,
      ),
    };
  }

  return { user };
};

async function _GET(request: Request) {
  const auth = requireAdmin(request);
  if (auth.error) {
    return auth.error;
  }

  const { searchParams } = new URL(request.url);
  const limit = searchParams.get("limit");
  const offset = searchParams.get("offset");

  const result = listRoleRequests({
    limit: limit ? Number(limit) : undefined,
    offset: offset ? Number(offset) : undefined,
  });

  return hal(
    {
      count: result.count,
      limit: result.limit,
      offset: result.offset,
      items: result.items,
    },
    {
      self: { href: "/api/v1/admin/role-requests" },
    },
    {
      headers: {
        "cache-control": "no-store",
      },
    },
  );
}

export const GET = withRequestLogging(_GET);
