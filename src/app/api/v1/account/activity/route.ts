import { getSessionUserFromRequest } from "../../../../../lib/api/auth";
import { listAuditEntries } from "../../../../../lib/api/audit";
import { hal, problem } from "../../../../../lib/api/response";
import { withRequestLogging } from "../../../../../lib/api/request-logging";

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

  try {
    const result = listAuditEntries({
      actor_id: user.id,
      limit: 5,
      offset: 0,
    });

    return hal(
      {
        count: result.count,
        items: result.items,
      },
      {
        self: { href: "/api/v1/account/activity" },
        me: { href: "/api/v1/me" },
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
        detail: "Unable to load activity.",
      },
      request,
    );
  }
}

export const GET = withRequestLogging(_GET);
