import { hal, problem } from "../../../../lib/api/response";
import { listApprovedApprentices, type ApprenticeProfileRecord } from "../../../../lib/api/apprentices";
import { withRequestLogging } from "../../../../lib/api/request-logging";

async function _GET(request: Request) {
  try {
    const items = listApprovedApprentices().map((row: ApprenticeProfileRecord) => ({
      handle: row.handle,
      display_name: row.display_name,
      headline: row.headline,
      location: row.location,
      website_url: row.website_url,
      tags: row.tags,
      _links: {
        self: { href: `/api/v1/apprentices/${row.handle}` },
        profile: { href: `/apprentices/${row.handle}` },
      },
    }));

    return hal(
      { count: items.length, items },
      {
        self: { href: "/api/v1/apprentices" },
      },
      {
        headers: {
          "cache-control": "no-store",
        },
      },
    );
  } catch {
    return problem(
      {
        type: "https://lms-219.dev/problems/internal",
        title: "Internal Server Error",
        status: 500,
        detail: "Unable to load apprentices.",
      },
      request,
    );
  }
}

export const GET = withRequestLogging(_GET);
