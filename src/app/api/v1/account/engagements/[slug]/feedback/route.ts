import { InvalidInputError } from "../../../../../../../core/domain/errors";
import {
  EngagementNotFoundError,
  ForbiddenEngagementAccessError,
  submitEngagementFeedback,
} from "../../../../../../../lib/api/engagements";
import { getSessionUserFromRequest, isSameOriginMutation } from "../../../../../../../lib/api/auth";
import { hal, problem } from "../../../../../../../lib/api/response";
import { parsePayload } from "../../../../../../../lib/api/validate";
import { feedbackSchema } from "../../../../../../../lib/api/schemas";
import { withRequestLogging } from "../../../../../../../lib/api/request-logging";
import { withRateLimit } from "../../../../../../../lib/api/rate-limit-wrapper";

async function _POST(request: Request, context: { params: Promise<{ slug: string }> }) {
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

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return problem(
      {
        type: "https://lms-219.dev/problems/invalid-json",
        title: "Invalid JSON",
        status: 400,
        detail: "Request body must be valid JSON.",
      },
      request,
    );
  }

  const parsed = parsePayload(feedbackSchema, raw, request);
  if (!parsed.success) return parsed.response;

  try {
    const result = submitEngagementFeedback({
      eventSlug: slug,
      user,
      requestId: request.headers.get("x-request-id") ?? crypto.randomUUID(),
      rating: parsed.data.rating ?? 0,
      comment: parsed.data.comment,
    });

    return hal(result as unknown as Record<string, unknown>, {
      self: { href: `/api/v1/account/engagements/${slug}/feedback` },
      engagement: { href: `/api/v1/account/engagements` },
    });
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
          detail: "You are not allowed to submit feedback for this engagement.",
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
        detail: "Unable to submit engagement feedback.",
      },
      request,
    );
  }
}

export const POST = withRequestLogging(withRateLimit("user:write", _POST));
