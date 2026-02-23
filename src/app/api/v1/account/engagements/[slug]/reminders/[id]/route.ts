import { InvalidInputError } from "../../../../../../../../core/domain/errors";
import {
  acknowledgeReminder,
  EngagementNotFoundError,
  EngagementReminderNotFoundError,
  ForbiddenEngagementAccessError,
  snoozeReminder,
} from "../../../../../../../../lib/api/engagements";
import { getSessionUserFromRequest, isSameOriginMutation } from "../../../../../../../../lib/api/auth";
import { hal, problem } from "../../../../../../../../lib/api/response";
import { parsePayload } from "../../../../../../../../lib/api/validate";
import { reminderUpdateSchema } from "../../../../../../../../lib/api/schemas";
import { withRequestLogging } from "../../../../../../../../lib/api/request-logging";
import { withRateLimit } from "../../../../../../../../lib/api/rate-limit-wrapper";

async function _PATCH(
  request: Request,
  context: { params: Promise<{ slug: string; id: string }> },
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

  const { slug, id } = await context.params;

  try {
    let raw: unknown = null;
    try {
      raw = await request.json();
    } catch {
      raw = null;
    }

    const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();

    let snoozeDays: number | undefined;
    if (raw !== null) {
      const parsed = parsePayload(reminderUpdateSchema, raw, request);
      if (!parsed.success) return parsed.response;
      snoozeDays = parsed.data.snooze_days;
    }

    const updated =
      snoozeDays === 1 || snoozeDays === 3 || snoozeDays === 7
        ? snoozeReminder({
            eventSlug: slug,
            reminderId: id,
            user,
            requestId,
            snoozeDays,
          })
        : acknowledgeReminder({
            eventSlug: slug,
            reminderId: id,
            user,
            requestId,
          });

    return hal(updated as unknown as Record<string, unknown>, {
      self: { href: `/api/v1/account/engagements/${slug}/reminders/${id}` },
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

    if (error instanceof EngagementReminderNotFoundError) {
      return problem(
        {
          type: "https://lms-219.dev/problems/not-found",
          title: "Not Found",
          status: 404,
          detail: `Reminder '${id}' was not found.`,
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
          detail: "You are not allowed to acknowledge this reminder.",
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
        detail: "Unable to update reminder.",
      },
      request,
    );
  }
}

export const PATCH = withRequestLogging(withRateLimit("user:write", _PATCH));
