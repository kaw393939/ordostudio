import { getSessionUserFromRequest, isSameOriginMutation } from "../../../../../lib/api/auth";
import { hal, problem } from "../../../../../lib/api/response";
import { parsePayload } from "../../../../../lib/api/validate";
import { updateUserStatusSchema } from "../../../../../lib/api/schemas";
import {
  getUserById,
  InvalidUserStatusError,
  updateUserStatus,
  UserNotFoundError,
} from "../../../../../lib/api/users";
import { withRequestLogging } from "../../../../../lib/api/request-logging";
import { withRateLimit } from "../../../../../lib/api/rate-limit-wrapper";

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

async function _GET(request: Request, context: RouteContext) {
  const auth = requireAdmin(request);
  if (auth.error) {
    return auth.error;
  }

  const { id } = await context.params;

  try {
    const found = getUserById(id);
    return hal({ ...found }, {
      self: { href: `/api/v1/users/${id}` },
      roles: { href: `/api/v1/users/${id}/roles` },
    });
  } catch (error) {
    if (error instanceof UserNotFoundError) {
      return problem(
        {
          type: "https://lms-219.dev/problems/not-found",
          title: "Not Found",
          status: 404,
          detail: "User not found.",
        },
        request,
      );
    }

    return problem(
      {
        type: "https://lms-219.dev/problems/internal",
        title: "Internal Server Error",
        status: 500,
        detail: "Unable to load user.",
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

  const parsed = parsePayload(updateUserStatusSchema, raw, request);
  if (!parsed.success) return parsed.response;

  if (!parsed.data.status) {
    return problem(
      {
        type: "https://lms-219.dev/problems/invalid-input",
        title: "Bad Request",
        status: 400,
        detail: "status is required.",
      },
      request,
    );
  }

  if (parsed.data.confirm !== true) {
    return problem(
      {
        type: "https://lms-219.dev/problems/precondition-failed",
        title: "Precondition Failed",
        status: 412,
        detail: "User status updates require explicit confirmation.",
      },
      request,
    );
  }

  try {
    const updated = updateUserStatus(id, parsed.data.status, auth.user.id, crypto.randomUUID());
    return hal({ ...updated }, {
      self: { href: `/api/v1/users/${id}` },
      roles: { href: `/api/v1/users/${id}/roles` },
    });
  } catch (error) {
    if (error instanceof InvalidUserStatusError) {
      return problem(
        {
          type: "https://lms-219.dev/problems/invalid-input",
          title: "Bad Request",
          status: 400,
          detail: "Invalid status. Allowed: ACTIVE, DISABLED, PENDING.",
        },
        request,
      );
    }

    if (error instanceof UserNotFoundError) {
      return problem(
        {
          type: "https://lms-219.dev/problems/not-found",
          title: "Not Found",
          status: 404,
          detail: "User not found.",
        },
        request,
      );
    }

    return problem(
      {
        type: "https://lms-219.dev/problems/internal",
        title: "Internal Server Error",
        status: 500,
        detail: "Unable to update user.",
      },
      request,
    );
  }
}

export const GET = withRequestLogging(_GET);
export const PATCH = withRequestLogging(withRateLimit("user:write", _PATCH));
