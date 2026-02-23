import { getSessionUserFromRequest, isSameOriginMutation } from "../../../../lib/api/auth";
import { hal, problem } from "../../../../lib/api/response";
import { parsePayload } from "../../../../lib/api/validate";
import { createInstructorSchema } from "../../../../lib/api/schemas";
import { createInstructor, listInstructors } from "../../../../lib/api/instructors";
import { InvalidInputError } from "../../../../core/domain/errors";
import { withRequestLogging } from "../../../../lib/api/request-logging";
import { withRateLimit } from "../../../../lib/api/rate-limit-wrapper";

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

async function _GET(request: Request) {
  const auth = requireAdmin(request);
  if (auth.error) {
    return auth.error;
  }

  const items = listInstructors().map((item) => ({
    ...item,
    _links: {
      self: { href: `/api/v1/instructors/${item.id}` },
      "app:add-availability": { href: `/api/v1/instructors/${item.id}/availability` },
    },
  }));

  return hal(
    {
      count: items.length,
      items,
    },
    {
      self: { href: "/api/v1/instructors" },
    },
  );
}

async function _POST(request: Request) {
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

  const parsed = parsePayload(createInstructorSchema, raw, request);
  if (!parsed.success) return parsed.response;

  try {
    const created = createInstructor(
      {
        name: parsed.data.name,
        email: parsed.data.email,
        status: parsed.data.status,
        capabilities: parsed.data.capabilities,
      },
      auth.user.id,
      crypto.randomUUID(),
    );

    return hal(
      created,
      {
        self: { href: `/api/v1/instructors/${created.id}` },
        collection: { href: "/api/v1/instructors" },
        "app:add-availability": { href: `/api/v1/instructors/${created.id}/availability` },
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
          detail: "Invalid instructor payload.",
        },
        request,
      );
    }

    return problem(
      {
        type: "https://lms-219.dev/problems/internal",
        title: "Internal Server Error",
        status: 500,
        detail: "Unable to create instructor.",
      },
      request,
    );
  }
}

export const GET = withRequestLogging(_GET);
export const POST = withRequestLogging(withRateLimit("user:write", _POST));
