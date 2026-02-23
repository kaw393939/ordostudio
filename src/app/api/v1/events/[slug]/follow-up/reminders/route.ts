import { InvalidInputError } from "../../../../../../../core/domain/errors";
import { getSessionUserFromRequest, isSameOriginMutation } from "../../../../../../../lib/api/auth";
import {
  EngagementNotFoundError,
  generateFollowUpReminders,
} from "../../../../../../../lib/api/engagements";
import { hal, problem } from "../../../../../../../lib/api/response";
import { withRequestLogging } from "../../../../../../../lib/api/request-logging";
import { withRateLimit } from "../../../../../../../lib/api/rate-limit-wrapper";

const requireAdmin = (request: Request) => {
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

  if (!user.roles.includes("ADMIN") && !user.roles.includes("SUPER_ADMIN")) {
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
};

async function _POST(request: Request, context: { params: Promise<{ slug: string }> }) {
  const auth = requireAdmin(request);
  if ("error" in auth) {
    return auth.error;
  }

  if (!isSameOriginMutation(request)) {
    return problem(
      {
        type: "https://lms-219.dev/problems/forbidden",
        title: "Forbidden",
        status: 403,
        detail: "Cross-origin mutation denied.",
      },
      request,
    );
  }

  const { slug } = await context.params;

  try {
    const created = generateFollowUpReminders({
      eventSlug: slug,
      actorId: auth.user.id,
      requestId: request.headers.get("x-request-id") ?? crypto.randomUUID(),
    });

    return hal(created as unknown as Record<string, unknown>, {
      self: { href: `/api/v1/events/${slug}/follow-up/reminders` },
      event: { href: `/api/v1/events/${slug}` },
    });
  } catch (error) {
    if (error instanceof EngagementNotFoundError) {
      return problem(
        {
          type: "https://lms-219.dev/problems/not-found",
          title: "Not Found",
          status: 404,
          detail: `Event '${slug}' was not found.`,
        },
        request,
      );
    }

    if (error instanceof InvalidInputError) {
      return problem(
        {
          type: "https://lms-219.dev/problems/invalid-input",
          title: "Invalid Input",
          status: 400,
          detail: error.message,
        },
        request,
      );
    }

    return problem(
      {
        type: "https://lms-219.dev/problems/internal",
        title: "Internal Server Error",
        status: 500,
        detail: "Unable to generate follow-up reminders.",
      },
      request,
    );
  }
}

export const POST = withRequestLogging(withRateLimit("user:write", _POST));
