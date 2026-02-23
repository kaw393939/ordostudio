import { hal, problem } from "../../../../lib/api/response";
import { listLevels } from "../../../../lib/api/apprentice-progress";
import { withRequestLogging } from "../../../../lib/api/request-logging";

async function _GET(request: Request) {
  try {
    const levels = listLevels();
    return hal(
      {
        count: levels.length,
        items: levels.map((l) => ({
          slug: l.slug,
          name: l.name,
          ordinal: l.ordinal,
          description: l.description,
          min_gate_projects: l.min_gate_projects,
          min_vocabulary: l.min_vocabulary,
          human_edge_focus: l.human_edge_focus,
          salary_range: l.salary_range,
          _links: {
            self: { href: `/api/v1/apprentice-levels` },
          },
        })),
      },
      { self: { href: "/api/v1/apprentice-levels" } },
      { headers: { "cache-control": "public, max-age=3600" } },
    );
  } catch {
    return problem(
      {
        type: "https://lms-219.dev/problems/internal",
        title: "Internal Server Error",
        status: 500,
        detail: "Unable to load apprentice levels.",
      },
      request,
    );
  }
}

export const GET = withRequestLogging(_GET);
