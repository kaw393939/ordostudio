import { getSessionUserFromRequest, isSameOriginMutation } from "../../../../../../../lib/api/auth";
import { hal, problem } from "../../../../../../../lib/api/response";
import { parsePayload } from "../../../../../../../lib/api/validate";
import { scheduleNewsletterSchema } from "../../../../../../../lib/api/schemas";
import {
  NewsletterIssueNotFoundError,
  NewsletterScheduleGuardrailError,
  scheduleNewsletterSend,
} from "../../../../../../../lib/api/newsletter";
import { asUserActor } from "../../../../../../../lib/api/actor";
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

async function _POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!isSameOriginMutation(request)) {
    return problem(
      {
        type: "https://lms-219.dev/problems/csrf-check-failed",
        title: "Forbidden",
        status: 403,
        detail: "Cross-origin mutation request rejected.",
      },
      request,
    );
  }

  const auth = requireAdmin(request);
  if ("error" in auth) {
    return auth.error;
  }

  const { id } = await context.params;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return problem(
      {
        type: "https://lms-219.dev/problems/invalid-json",
        title: "Bad Request",
        status: 400,
        detail: "Request body must be valid JSON.",
      },
      request,
    );
  }

  const parsed = parsePayload(scheduleNewsletterSchema, raw, request);
  if (!parsed.success) return parsed.response;

  try {
    const run = scheduleNewsletterSend({
      issueId: id,
      scheduledFor: parsed.data.scheduled_for ?? "",
      actor: asUserActor(auth.user.id),
      requestId: crypto.randomUUID(),
    });

    return hal(
      run,
      {
        self: { href: `/api/v1/admin/newsletter/${id}/schedule` },
        "app:issue": { href: `/api/v1/admin/newsletter/${id}` },
        "app:send-runs": { href: `/api/v1/admin/newsletter/${id}/send-runs` },
      },
      {
        headers: {
          "cache-control": "no-store",
        },
      },
    );
  } catch (error) {
    if (error instanceof NewsletterIssueNotFoundError) {
      return problem(
        {
          type: "https://lms-219.dev/problems/not-found",
          title: "Not Found",
          status: 404,
          detail: "Newsletter issue not found.",
        },
        request,
      );
    }

    if (error instanceof NewsletterScheduleGuardrailError) {
      const detail =
        error.reason === "invalid_scheduled_for"
          ? "scheduled_for must be a valid ISO timestamp."
          : "Only published issues can be scheduled.";
      return problem(
        {
          type: "https://lms-219.dev/problems/precondition-failed",
          title: "Precondition Failed",
          status: error.reason === "invalid_scheduled_for" ? 400 : 412,
          detail,
        },
        request,
      );
    }

    return problem(
      {
        type: "https://lms-219.dev/problems/internal",
        title: "Internal Server Error",
        status: 500,
        detail: "Unable to schedule send.",
      },
      request,
    );
  }
}

export const POST = withRequestLogging(withRateLimit("admin:write", _POST));
