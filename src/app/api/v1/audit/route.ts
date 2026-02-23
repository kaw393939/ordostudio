import { getSessionUserFromRequest } from "../../../../lib/api/auth";
import { listAuditEntries } from "../../../../lib/api/audit";
import { hal, problem } from "../../../../lib/api/response";
import { withRequestLogging } from "../../../../lib/api/request-logging";

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

  if (!user.roles.includes("ADMIN") && !user.roles.includes("SUPER_ADMIN")) {
    return problem(
      {
        type: "https://lms-219.dev/problems/forbidden",
        title: "Forbidden",
        status: 403,
        detail: "Admin role required.",
      },
      request,
    );
  }

  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action") ?? undefined;
  const actor_id = searchParams.get("actor_id") ?? undefined;
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;
  const limit = searchParams.get("limit");
  const offset = searchParams.get("offset");

  try {
    const result = listAuditEntries({
      action,
      actor_id,
      from,
      to,
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
        self: { href: "/api/v1/audit" },
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
        detail: "Unable to load audit log.",
      },
      request,
    );
  }
}

export const GET = withRequestLogging(_GET);
