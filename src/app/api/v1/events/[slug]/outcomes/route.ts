import { InvalidInputError } from "../../../../../../core/domain/errors";
import { getSessionUserFromRequest, isSameOriginMutation } from "../../../../../../lib/api/auth";
import { createSessionOutcome, EngagementNotFoundError } from "../../../../../../lib/api/engagements";
import { hal, problem } from "../../../../../../lib/api/response";
import { withRequestLogging } from "../../../../../../lib/api/request-logging";
import { withRateLimit } from "../../../../../../lib/api/rate-limit-wrapper";
import { parsePayload } from "../../../../../../lib/api/validate";
import { outcomeSchema } from "../../../../../../lib/api/schemas";

const requireStaff = (request: Request) => {
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
  const auth = requireStaff(request);
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

  const parsed = parsePayload(outcomeSchema, raw, request);
  if (!parsed.success) return parsed.response;

  try {
    const created = createSessionOutcome({
      eventSlug: slug,
      actorId: auth.user.id,
      requestId: request.headers.get("x-request-id") ?? crypto.randomUUID(),
      title: parsed.data.title ?? "",
      sessionAt: parsed.data.session_at ?? "",
      summary: parsed.data.summary,
      status: parsed.data.status,
      outcomes: parsed.data.outcomes,
      actionItems: (parsed.data.action_items ?? []).map((item) => ({
        description: item.description,
        dueAt: item.due_at,
      })),
      nextStep: parsed.data.next_step,
    });

    return hal(created as unknown as Record<string, unknown>, {
      self: { href: `/api/v1/events/${slug}/outcomes` },
      event: { href: `/api/v1/events/${slug}` },
    }, { status: 201 });
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
        detail: "Unable to create session outcome.",
      },
      request,
    );
  }
}

export const POST = withRequestLogging(withRateLimit("user:write", _POST));
