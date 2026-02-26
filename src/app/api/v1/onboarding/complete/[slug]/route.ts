/**
 * POST /api/v1/onboarding/complete/:slug
 *
 * Authenticated user. Marks a task complete and triggers the completion check.
 */

import { NextRequest } from "next/server";
import { getSessionUserFromRequest } from "@/lib/api/auth";
import { problem } from "@/lib/api/response";
import { checkOnboardingComplete } from "@/lib/api/provisioning";
import { openCliDb } from "@/platform/runtime";
import { resolveConfig } from "@/platform/config";
import { withRequestLogging } from "@/lib/api/request-logging";

async function _POST(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> },
) {
  const user = getSessionUserFromRequest(request);
  if (!user) {
    return problem(
      { type: "https://lms-219.dev/problems/unauthorized", title: "Unauthorized", status: 401, detail: "Active session required." },
      request,
    );
  }

  const { slug } = await context.params;

  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);
  try {
    // Resolve task by slug
    const task = db
      .prepare("SELECT id FROM onboarding_tasks WHERE slug = ?")
      .get(slug) as { id: string } | undefined;

    if (!task) {
      return problem(
        { type: "https://lms-219.dev/problems/not-found", title: "Not Found", status: 404, detail: `Task '${slug}' not found.` },
        request,
      );
    }

    // Check that the user has this task in their progress
    const progress = db
      .prepare(
        "SELECT id, completed FROM onboarding_progress WHERE user_id = ? AND task_id = ?",
      )
      .get(user.id, task.id) as { id: string; completed: number } | undefined;

    if (!progress) {
      return problem(
        { type: "https://lms-219.dev/problems/not-found", title: "Not Found", status: 404, detail: `Task '${slug}' not assigned to your account.` },
        request,
      );
    }

    if (progress.completed === 1) {
      return Response.json({ slug, completed: true, already_done: true });
    }

    const now = new Date().toISOString();
    db.prepare(
      "UPDATE onboarding_progress SET completed = 1, completed_at = ? WHERE id = ?",
    ).run(now, progress.id);

    const allDone = checkOnboardingComplete(db, user.id);

    return Response.json({ slug, completed: true, already_done: false, all_required_complete: allDone });
  } finally {
    db.close();
  }
}

export const POST = withRequestLogging(_POST);
