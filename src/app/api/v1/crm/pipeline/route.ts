/**
 * GET /api/v1/crm/pipeline
 *
 * Staff-only — returns contact counts by status bucket.
 * Powers the pipeline kanban board.
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

  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);
  try {
    const rows = db
      .prepare(
        `SELECT status, COUNT(*) AS count FROM contacts GROUP BY status`,
      )
      .all() as Array<{ status: string; count: number }>;

    const buckets: Record<string, number> = {
      LEAD: 0,
      QUALIFIED: 0,
      ONBOARDING: 0,
      ACTIVE: 0,
      CHURNED: 0,
    };
    for (const row of rows) {
      if (row.status in buckets) {
        buckets[row.status] = row.count;
      }
    }

    const total = rows.reduce((acc, r) => acc + r.count, 0);
    return Response.json({ buckets, total });
  } finally {
    db.close();
  }
}

export const GET = withRequestLogging(_GET);
