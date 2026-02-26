/**
 * GET /api/v1/maestro/availability
 *
 * Public endpoint — returns OPEN slots in the next 30 days.
 * Used by the intake agent and the booking page.
 */

import { NextRequest } from "next/server";
import { openCliDb } from "@/platform/runtime";
import { resolveConfig } from "@/platform/config";
import { withRequestLogging } from "@/lib/api/request-logging";

async function _GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const rawLimit = searchParams.get("limit");
  const limit = rawLimit ? Math.min(Math.max(1, Number(rawLimit)), 50) : 20;

  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);

  try {
    const cutoff = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const now = new Date().toISOString();

    const slots = db
      .prepare(
        `SELECT id, maestro_user_id, start_at, end_at, status, created_at
         FROM maestro_availability
         WHERE status = 'OPEN'
           AND start_at >= ?
           AND start_at <= ?
         ORDER BY start_at ASC
         LIMIT ?`,
      )
      .all(now, cutoff, limit) as Array<{
      id: string;
      maestro_user_id: string;
      start_at: string;
      end_at: string;
      status: string;
      created_at: string;
    }>;

    return Response.json({ slots, count: slots.length });
  } finally {
    db.close();
  }
}

export const GET = withRequestLogging(_GET);
