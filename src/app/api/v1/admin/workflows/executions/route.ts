/**
 * GET /api/v1/admin/workflows/executions — paginated execution log
 *
 * Staff only (ADMIN | SUPER_ADMIN | MAESTRO)
 */

import { NextRequest } from "next/server";
import { getSessionUserFromRequest } from "@/lib/api/auth";
import { problem } from "@/lib/api/response";
import { openCliDb } from "@/platform/runtime";
import { resolveConfig } from "@/platform/config";
import { withRequestLogging } from "@/lib/api/request-logging";

function requireStaff(request: Request) {
  const user = getSessionUserFromRequest(request);
  if (!user) {
    return {
      error: problem(
        { type: "https://lms-219.dev/problems/unauthorized", title: "Unauthorized", status: 401, detail: "Active session required." },
        request,
      ),
    };
  }
  const isStaff =
    user.roles.includes("ADMIN") ||
    user.roles.includes("SUPER_ADMIN") ||
    user.roles.includes("MAESTRO");
  if (!isStaff) {
    return {
      error: problem(
        { type: "https://lms-219.dev/problems/forbidden", title: "Forbidden", status: 403, detail: "Staff access required." },
        request,
      ),
    };
  }
  return { user };
}

async function _GET(request: NextRequest) {
  const auth = requireStaff(request);
  if (auth.error) return auth.error;

  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") ?? "50", 10)));
  const offset = (page - 1) * limit;

  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);
  try {
    const executions = db
      .prepare(
        `SELECT we.id, we.rule_id, wr.name AS rule_name, we.feed_event_id, we.status, we.error, we.executed_at
         FROM workflow_executions we
         LEFT JOIN workflow_rules wr ON wr.id = we.rule_id
         ORDER BY we.executed_at DESC
         LIMIT ? OFFSET ?`,
      )
      .all(limit, offset);

    const total = (
      db.prepare("SELECT COUNT(*) AS count FROM workflow_executions").get() as { count: number }
    ).count;

    return Response.json({ executions, total, page, limit });
  } finally {
    db.close();
  }
}

export const GET = withRequestLogging(_GET);
