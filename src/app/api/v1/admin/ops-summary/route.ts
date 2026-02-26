/**
 * GET /api/v1/admin/ops-summary
 *
 * Returns a combined 7-day ops summary (revenue + recent activity).
 * Admin/maestro access only. Polled by the admin chat UI widget.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSessionUserFromRequest } from "@/lib/api/auth";
import { problem } from "@/lib/api/response";
import { openCliDb } from "@/platform/runtime";
import { resolveConfig } from "@/platform/config";
import { executeMaestroTool } from "@/lib/api/maestro-tools";

const OPS_ROLES = ["ADMIN", "SUPER_ADMIN", "MAESTRO"] as const;

function requireOpsAccess(request: NextRequest) {
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

  const hasRole = OPS_ROLES.some((r) => user.roles.includes(r));
  if (!hasRole) {
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
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = requireOpsAccess(request);
  if (auth.error) return auth.error as unknown as NextResponse;

  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);

  try {
    const summary = executeMaestroTool("get_ops_summary", {}, db);
    return NextResponse.json(summary);
  } finally {
    db.close();
  }
}
