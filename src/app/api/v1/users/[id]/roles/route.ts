import { getSessionUserFromRequest, isSameOriginMutation } from "../../../../../../lib/api/auth";
import { hal, problem } from "../../../../../../lib/api/response";
import { parsePayload } from "../../../../../../lib/api/validate";
import { assignRoleSchema } from "../../../../../../lib/api/schemas";
import {
  addUserRole,
  SuperAdminRoleForbiddenError,
  UserNotFoundError,
} from "../../../../../../lib/api/users";
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

  const parsed = parsePayload(assignRoleSchema, raw, request);
  if (!parsed.success) return parsed.response;

  if (parsed.data.confirm !== true) {
    return problem(
      {
        type: "https://lms-219.dev/problems/precondition-failed",
        title: "Precondition Failed",
        status: 412,
        detail: "Role updates require explicit confirmation.",
      },
      request,
    );
  }

  try {
    const result = addUserRole(id, parsed.data.role, auth.user.id, crypto.randomUUID());
    return hal(
      {
        user_id: id,
        role: result.role,
        changed: result.changed,
      },
      {
        self: { href: `/api/v1/users/${id}/roles` },
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
        detail: "Unable to add role.",
      },
      request,
    );
  }
}

export const POST = withRequestLogging(withRateLimit("user:write", _POST));
