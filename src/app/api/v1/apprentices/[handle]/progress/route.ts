import { hal, problem } from "../../../../../../lib/api/response";
import {
  getApprenticeProgress,
} from "../../../../../../lib/api/apprentice-progress";
import { getPublicApprenticeByHandle, ApprenticeProfileNotFoundError } from "../../../../../../lib/api/apprentices";
import { withRequestLogging } from "../../../../../../lib/api/request-logging";

async function _GET(request: Request, context: { params: Promise<{ handle: string }> }) {
  const { handle } = await context.params;

  try {
    // Look up the apprentice by handle to get their user_id
    const profile = getPublicApprenticeByHandle(handle);
    const progress = getApprenticeProgress(profile.user_id);

    return hal(
      {
        handle,
        current_level: progress.currentLevel
          ? {
              slug: progress.currentLevel.slug,
              name: progress.currentLevel.name,
              ordinal: progress.currentLevel.ordinal,
            }
          : null,
        levels: progress.levels.map((l) => ({
          slug: l.slug,
          name: l.name,
          ordinal: l.ordinal,
          min_gate_projects: l.min_gate_projects,
          min_vocabulary: l.min_vocabulary,
        })),
        gate_projects_completed: progress.submissions.filter((s) => s.status === "PASSED").length,
        gate_projects_total: progress.gateProjects.length,
        vocabulary_count: progress.vocabularyCount,
        next_gate: progress.nextGate
          ? { slug: progress.nextGate.slug, title: progress.nextGate.title }
          : null,
      },
      {
        self: { href: `/api/v1/apprentices/${handle}/progress` },
        profile: { href: `/api/v1/apprentices/${handle}` },
      },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof ApprenticeProfileNotFoundError) {
      return problem(
        {
          type: "https://lms-219.dev/problems/not-found",
          title: "Not Found",
          status: 404,
          detail: "Apprentice profile not found.",
        },
        request,
      );
    }
    return problem(
      {
        type: "https://lms-219.dev/problems/internal",
        title: "Internal Server Error",
        status: 500,
        detail: "Unable to load apprentice progress.",
      },
      request,
    );
  }
}

export const GET = withRequestLogging(_GET);
