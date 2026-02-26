/**
 * GET /api/v1/onboarding
 *
 * Authenticated user. Returns their onboarding task list with completion status.
 */

import { NextRequest } from "next/server";
import { getSessionUserFromRequest } from "@/lib/api/auth";
import { problem } from "@/lib/api/response";
import { openCliDb } from "@/platform/runtime";
import { resolveConfig } from "@/platform/config";
import { withRequestLogging } from "@/lib/api/request-logging";

interface OnboardingTaskRow {
  slug: string;
  title: string;
  description: string;
  role: string;
  position: number;
  required: number;
  completed: number;
  completed_at: string | null;
}

async function _GET(request: NextRequest) {
  const user = getSessionUserFromRequest(request);
  if (!user) {
    return problem(
      { type: "https://lms-219.dev/problems/unauthorized", title: "Unauthorized", status: 401, detail: "Active session required." },
      request,
    );
  }

  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);
  try {
    const tasks = db
      .prepare(
        `SELECT ot.slug, ot.title, ot.description, ot.role, ot.position, ot.required,
                COALESCE(op.completed, 0) AS completed,
                op.completed_at
         FROM onboarding_tasks ot
         LEFT JOIN onboarding_progress op ON op.task_id = ot.id AND op.user_id = ?
         WHERE op.user_id IS NOT NULL
         ORDER BY ot.position ASC`,
      )
      .all(user.id) as OnboardingTaskRow[];

    const allRequiredComplete =
      tasks.length > 0 &&
      tasks.filter((t) => t.required === 1).every((t) => t.completed === 1);

    return Response.json({
      tasks: tasks.map((t) => ({
        slug: t.slug,
        title: t.title,
        description: t.description,
        role: t.role,
        position: t.position,
        required: t.required === 1,
        completed: t.completed === 1,
        completed_at: t.completed_at ?? undefined,
      })),
      all_required_complete: allRequiredComplete,
    });
  } finally {
    db.close();
  }
}

export const GET = withRequestLogging(_GET);
