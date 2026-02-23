import { getSessionUserFromRequest, isSameOriginMutation } from "../../../../../../../lib/api/auth";
import { hal, problem } from "../../../../../../../lib/api/response";
import {
  removeUserRole,
  SuperAdminRoleForbiddenError,
  UserNotFoundError,
} from "../../../../../../../lib/api/users";
import { withRequestLogging } from "../../../../../../../lib/api/request-logging";
import { withRateLimit } from "../../../../../../../lib/api/rate-limit-wrapper";

type RouteContext = {
  params: Promise<{ id: string; role: string }>;
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

  if (!user.roles.includes("SUPER_ADMIN")) {
    return {
      error: problem(
        {
          type: "https://lms-219.dev/problems/forbidden",
          title: "Forbidden",
          status: 403,
          detail: "Super Admin role required.",
        },
        request,
      ),
    };
  }

  return { user };
};

async function _DELETE(request: Request, context: RouteContext) {
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

  const { searchParams } = new URL(request.url);
  if (searchParams.get("confirm") !== "true") {
    return problem(
      {
        type: "https://lms-219.dev/problems/precondition-failed",
        title: "Precondition Failed",
        status: 412,
        detail: "Role removals require explicit confirmation.",
      },
      request,
    );
  }

  const { id, role } = await context.params;

  try {
    const result = removeUserRole(id, role, auth.user.id, crypto.randomUUID());
    return hal(
      {
        user_id: id,
        role: result.role,
        changed: result.changed,
      },
      {
        self: { href: `/api/v1/users/${id}/roles/${role.toUpperCase()}` },
        user: { href: `/api/v1/users/${id}` },
      },
    );
  } catch (error) {
    if (error instanceof SuperAdminRoleForbiddenError) {
      return problem(
        {
          type: "https://lms-219.dev/problems/forbidden",
          title: "Forbidden",
          status: 403,
          detail: "SUPER_ADMIN role changes are CLI-only.",
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
        detail: "Unable to remove role.",
      },
      request,
    );
  }
}

export const DELETE = withRequestLogging(withRateLimit("user:write", _DELETE));
