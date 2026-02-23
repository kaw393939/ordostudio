import { getSessionUserFromRequest, isSameOriginMutation } from "../../../../../../lib/api/auth";
import { hal, problem } from "../../../../../../lib/api/response";
import { withRequestLogging } from "../../../../../../lib/api/request-logging";
import { withRateLimit } from "../../../../../../lib/api/rate-limit-wrapper";
import {
  getEventInstructorAssignment,
  listEventInstructorHistory,
  normalizeAssignmentState,
  transitionEventInstructorAssignment,
} from "../../../../../../lib/api/instructors";
import { EventNotFoundError, InvalidInputError } from "../../../../../../core/domain/errors";
import { parsePayload } from "../../../../../../lib/api/validate";
import { instructorUpdateSchema } from "../../../../../../lib/api/schemas";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

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

async function _GET(request: Request, context: RouteContext) {
  const auth = requireAdmin(request);
  if (auth.error) {
    return auth.error;
  }

  const { slug } = await context.params;

  try {
    const assignment = getEventInstructorAssignment(slug);
    const history = listEventInstructorHistory(slug);
    return hal(
      {
        ...assignment,
        history,
      },
      {
        self: { href: `/api/v1/events/${slug}/instructor` },
        event: { href: `/api/v1/events/${slug}` },
      },
    );
  } catch (error) {
    if (error instanceof EventNotFoundError) {
      return problem(
        {
          type: "https://lms-219.dev/problems/not-found",
          title: "Not Found",
          status: 404,
          detail: "Event not found.",
        },
        request,
      );
    }

    return problem(
      {
        type: "https://lms-219.dev/problems/internal",
        title: "Internal Server Error",
        status: 500,
        detail: "Unable to load event instructor assignment.",
      },
      request,
    );
  }
}

async function _PATCH(request: Request, context: RouteContext) {
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
  if (auth.error) {
    return auth.error;
  }

  const { slug } = await context.params;

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

  const parsed = parsePayload(instructorUpdateSchema, raw, request);
  if (!parsed.success) return parsed.response;

  try {
    const updated = transitionEventInstructorAssignment(
      slug,
      {
        state: normalizeAssignmentState(parsed.data.state!),
        instructorId: parsed.data.instructor_id ?? undefined,
        note: parsed.data.note ?? undefined,
      },
      auth.user.id,
      crypto.randomUUID(),
    );

    return hal(updated, {
      self: { href: `/api/v1/events/${slug}/instructor` },
      event: { href: `/api/v1/events/${slug}` },
    });
  } catch (error) {
    if (error instanceof EventNotFoundError) {
      return problem(
        {
          type: "https://lms-219.dev/problems/not-found",
          title: "Not Found",
          status: 404,
          detail: "Event not found.",
        },
        request,
      );
    }

    if (error instanceof InvalidInputError) {
      return problem(
        {
          type: "https://lms-219.dev/problems/invalid-input",
          title: "Bad Request",
          status: 400,
          detail: "Invalid instructor assignment transition payload.",
        },
        request,
      );
    }

    return problem(
      {
        type: "https://lms-219.dev/problems/internal",
        title: "Internal Server Error",
        status: 500,
        detail: "Unable to update event instructor assignment.",
      },
      request,
    );
  }
}

export const GET = withRequestLogging(_GET);
export const PATCH = withRequestLogging(withRateLimit("user:write", _PATCH));
