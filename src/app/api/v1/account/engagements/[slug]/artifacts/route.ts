import {
  EngagementNotFoundError,
  ForbiddenEngagementAccessError,
  listArtifactsForEngagement,
} from "../../../../../../../lib/api/engagements";
import { getSessionUserFromRequest } from "../../../../../../../lib/api/auth";
import { hal, problem } from "../../../../../../../lib/api/response";
import { withRequestLogging } from "../../../../../../../lib/api/request-logging";

async function _GET(request: Request, context: { params: Promise<{ slug: string }> }) {
  const user = getSessionUserFromRequest(request);
  if (!user) {
    return problem(
      {
        type: "https://lms-219.dev/problems/unauthorized",
        title: "Unauthorized",
        status: 401,
        detail: "Active session required.",
      },
      request,
    );
  }

  const { slug } = await context.params;

  try {
    const items = listArtifactsForEngagement({ eventSlug: slug, user });
    return hal(
      {
        count: items.length,
        items,
      },
      {
        self: { href: `/api/v1/account/engagements/${slug}/artifacts` },
        engagement: { href: `/api/v1/account/engagements` },
      },
      {
        headers: {
          "cache-control": "no-store",
        },
      },
    );
  } catch (error) {
    if (error instanceof EngagementNotFoundError) {
      return problem(
        {
          type: "https://lms-219.dev/problems/not-found",
          title: "Not Found",
          status: 404,
          detail: `Engagement '${slug}' was not found.`,
        },
        request,
      );
    }

    if (error instanceof ForbiddenEngagementAccessError) {
      return problem(
        {
          type: "https://lms-219.dev/problems/forbidden",
          title: "Forbidden",
          status: 403,
          detail: "You are not allowed to access these artifacts.",
        },
        request,
      );
    }

    return problem(
      {
        type: "https://lms-219.dev/problems/internal",
        title: "Internal Server Error",
        status: 500,
        detail: "Unable to load artifacts.",
      },
      request,
    );
  }
}

export const GET = withRequestLogging(_GET);
