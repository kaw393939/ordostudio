import { hal, problem } from "../../../../../lib/api/response";
import { ApprenticeProfileNotFoundError, getPublicApprenticeByHandle } from "../../../../../lib/api/apprentices";
import { withRequestLogging } from "../../../../../lib/api/request-logging";

async function _GET(request: Request, context: { params: Promise<{ handle: string }> }) {
  const { handle } = await context.params;

  try {
    const profile = getPublicApprenticeByHandle(handle);
    return hal(
      {
        handle: profile.handle,
        display_name: profile.display_name,
        headline: profile.headline,
        bio: profile.bio,
        location: profile.location,
        website_url: profile.website_url,
        tags: profile.tags,
      },
      {
        self: { href: `/api/v1/apprentices/${profile.handle}` },
        collection: { href: "/api/v1/apprentices" },
      },
      {
        headers: {
          "cache-control": "no-store",
        },
      },
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
        detail: "Unable to load apprentice profile.",
      },
      request,
    );
  }
}

export const GET = withRequestLogging(_GET);
