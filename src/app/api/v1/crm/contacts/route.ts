/**
 * GET /api/v1/crm/contacts
 *
 * Staff-only — paginated list of contacts with filters.
 */

import { NextRequest } from "next/server";
import { getSessionUserFromRequest } from "@/lib/api/auth";
import { problem } from "@/lib/api/response";
import { listContacts } from "@/lib/api/contacts";
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

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") ?? undefined;
  const source = searchParams.get("source") ?? undefined;
  const assignedTo = searchParams.get("assigned_to") ?? undefined;
  const page = searchParams.get("page") ? Number(searchParams.get("page")) : 1;
  const limit = searchParams.get("limit") ? Number(searchParams.get("limit")) : 25;

  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);
  try {
    const result = listContacts(db, { status, source, assignedTo, page, limit });
    return Response.json({
      items: result.items,
      total: result.total,
      limit: result.limit,
      offset: result.offset,
      page: result.page,
    });
  } finally {
    db.close();
  }
}

export const GET = withRequestLogging(_GET);
