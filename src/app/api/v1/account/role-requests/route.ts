import { getSessionUserFromRequest } from "../../../../../lib/api/auth";
import { hal, problem } from "../../../../../lib/api/response";
import { withRequestLogging } from "../../../../../lib/api/request-logging";
import { openCliDb } from "../../../../../platform/runtime";
import { resolveConfig } from "../../../../../platform/config";

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
      request
    );
  }

  const db = openCliDb(resolveConfig({ envVars: process.env }));
  const rows = db.prepare(`
    SELECT rr.*, r.name as requested_role_name
    FROM role_requests rr
    JOIN roles r ON rr.requested_role_id = r.id
    WHERE rr.user_id = ?
    ORDER BY rr.created_at DESC
  `).all(user.id) as any[];

  const items = rows.map((row) => ({
    ...row,
    context: row.context ? JSON.parse(row.context) : null,
  }));

  return hal(
    {
      items,
    },
    {
      self: { href: "/api/v1/account/role-requests" },
    },
    {
      headers: {
        "cache-control": "no-store",
      },
    }
  );
}

export const GET = withRequestLogging(_GET);
