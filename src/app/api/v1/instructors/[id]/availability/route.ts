import { getSessionUserFromRequest, isSameOriginMutation } from "../../../../../../lib/api/auth";
import { hal, problem } from "../../../../../../lib/api/response";
import { parsePayload } from "../../../../../../lib/api/validate";
import { instructorAvailabilitySchema } from "../../../../../../lib/api/schemas";
import { addInstructorAvailability, normalizeAvailabilityMode } from "../../../../../../lib/api/instructors";
import { InvalidInputError } from "../../../../../../core/domain/errors";
import { withRequestLogging } from "../../../../../../lib/api/request-logging";
import { withRateLimit } from "../../../../../../lib/api/rate-limit-wrapper";

type RouteContext = {
  params: Promise<{ id: string }>;
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

async function _POST(request: Request, context: RouteContext) {
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

  const parsed = parsePayload(instructorAvailabilitySchema, raw, request);
  if (!parsed.success) return parsed.response;

  try {
    const created = addInstructorAvailability(
      id,
      {
        start: parsed.data.start,
        end: parsed.data.end,
        timezone: parsed.data.timezone,
        deliveryMode: normalizeAvailabilityMode(parsed.data.delivery_mode),
      },
      auth.user.id,
      crypto.randomUUID(),
    );

    return hal(
      created,
      {
        self: { href: `/api/v1/instructors/${id}/availability/${created.id}` },
        instructor: { href: `/api/v1/instructors/${id}` },
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof InvalidInputError) {
      return problem(
        {
          type: "https://lms-219.dev/problems/invalid-input",
          title: "Bad Request",
          status: 400,
          detail: "Invalid instructor availability payload.",
        },
        request,
      );
    }

    return problem(
      {
        type: "https://lms-219.dev/problems/internal",
        title: "Internal Server Error",
        status: 500,
        detail: "Unable to add instructor availability.",
      },
      request,
    );
  }
}

export const POST = withRequestLogging(withRateLimit("user:write", _POST));
