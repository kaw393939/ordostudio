import { getSessionUserFromRequest, isSameOriginMutation } from "../../../../../lib/api/auth";
import { ExistingAccountError, InvalidEmailError, createAdminInvitation } from "../../../../../lib/api/invitations";
import { hal, problem } from "../../../../../lib/api/response";
import { parsePayload } from "../../../../../lib/api/validate";
import { createInvitationSchema } from "../../../../../lib/api/schemas";
import { withRequestLogging } from "../../../../../lib/api/request-logging";
import { withRateLimit } from "../../../../../lib/api/rate-limit-wrapper";

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

  const parsed = parsePayload(createInvitationSchema, raw, request);
  if (!parsed.success) return parsed.response;

  try {
    const created = createAdminInvitation(parsed.data.email, auth.user.id, crypto.randomUUID());

    return hal(
      {
        email: created.email,
        role: created.role,
        ...(created.token ? { invitation_token: created.token } : {}),
      },
      {
        self: { href: "/api/v1/admin/invitations" },
        accept: { href: "/api/v1/admin/invitations/accept" },
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    if (error instanceof InvalidEmailError) {
      return problem(
        {
          type: "https://lms-219.dev/problems/invalid-input",
          title: "Bad Request",
          status: 400,
          detail: "email is required.",
        },
        request,
      );
    }

    if (error instanceof ExistingAccountError) {
      return problem(
        {
          type: "https://lms-219.dev/problems/conflict",
          title: "Conflict",
          status: 409,
          detail: "Email already belongs to an account.",
        },
        request,
      );
    }

    return problem(
      {
        type: "https://lms-219.dev/problems/internal",
        title: "Internal Server Error",
        status: 500,
        detail: "Unable to create admin invitation.",
      },
      request,
    );
  }
}

export const POST = withRequestLogging(withRateLimit("admin:write", _POST));
