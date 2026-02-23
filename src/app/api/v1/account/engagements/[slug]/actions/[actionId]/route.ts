import { InvalidInputError } from "../../../../../../../../core/domain/errors";
import {
  EngagementActionNotFoundError,
  EngagementNotFoundError,
  ForbiddenEngagementAccessError,
  updateFollowUpAction,
} from "../../../../../../../../lib/api/engagements";
import { getSessionUserFromRequest, isSameOriginMutation } from "../../../../../../../../lib/api/auth";
import { hal, problem } from "../../../../../../../../lib/api/response";
import { parsePayload } from "../../../../../../../../lib/api/validate";
import { actionUpdateSchema } from "../../../../../../../../lib/api/schemas";
import { withRequestLogging } from "../../../../../../../../lib/api/request-logging";
import { withRateLimit } from "../../../../../../../../lib/api/rate-limit-wrapper";

async function _PATCH(
  request: Request,
  context: { params: Promise<{ slug: string; actionId: string }> },
) {
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

  const { slug, actionId } = await context.params;

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

  const parsed = parsePayload(actionUpdateSchema, raw, request);
  if (!parsed.success) return parsed.response;

  try {
    const updated = updateFollowUpAction({
      eventSlug: slug,
      actionId,
      user,
      requestId: request.headers.get("x-request-id") ?? crypto.randomUUID(),
      status: parsed.data.status,
      dueAt: parsed.data.due_at,
      ownerUserId: parsed.data.owner_user_id,
    });

    return hal(updated as unknown as Record<string, unknown>, {
      self: { href: `/api/v1/account/engagements/${slug}/actions/${actionId}` },
      follow_up: { href: `/api/v1/account/engagements/${slug}/follow-up` },
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

    if (error instanceof EngagementActionNotFoundError) {
      return problem(
        {
          type: "https://lms-219.dev/problems/not-found",
          title: "Not Found",
          status: 404,
          detail: `Follow-up action '${actionId}' was not found.`,
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
          detail: "You are not allowed to update this follow-up action.",
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
        detail: "Unable to update follow-up action.",
      },
      request,
    );
  }
}

export const PATCH = withRequestLogging(withRateLimit("user:write", _PATCH));
