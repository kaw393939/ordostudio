import { getSessionUserFromRequest, isSameOriginMutation } from "../../../../../../lib/api/auth";
import { hal, problem } from "../../../../../../lib/api/response";
import { parsePayload } from "../../../../../../lib/api/validate";
import { updateApprenticeSchema } from "../../../../../../lib/api/schemas";
import {
  ApprenticeProfileNotFoundError,
  setApprenticeProfileStatusAdmin,
} from "../../../../../../lib/api/apprentices";
import { withRequestLogging } from "../../../../../../lib/api/request-logging";
import { withRateLimit } from "../../../../../../lib/api/rate-limit-wrapper";

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

async function _PATCH(request: Request, context: { params: Promise<{ userId: string }> }) {
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

  const { userId } = await context.params;

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

  const parsed = parsePayload(updateApprenticeSchema, raw, request);
  if (!parsed.success) return parsed.response;

  const status = parsed.data.status;
  if (status !== "PENDING" && status !== "APPROVED" && status !== "SUSPENDED") {
    return problem(
      {
        type: "https://lms-219.dev/problems/invalid-input",
        title: "Bad Request",
        status: 400,
        detail: "Invalid status.",
      },
      request,
    );
  }

  try {
    const updated = setApprenticeProfileStatusAdmin({
      userId,
      status,
      reason: parsed.data.reason,
      actorId: auth.user.id,
      requestId: crypto.randomUUID(),
    });

    return hal(
      updated,
      {
        self: { href: `/api/v1/admin/apprentices/${userId}` },
        collection: { href: "/api/v1/admin/apprentices" },
      },
      {
        headers: { "cache-control": "no-store" },
      },
    );
  } catch (error) {
    if (error instanceof ApprenticeProfileNotFoundError) {
      return problem(
        {
          type: "https://lms-219.dev/problems/not-found",
          title: "Not Found",
          status: 404,
          detail: "Apprentice profile not found.",
        },
        request,
      );
    }

    return problem(
      {
        type: "https://lms-219.dev/problems/internal",
        title: "Internal Server Error",
        status: 500,
        detail: "Unable to update apprentice profile.",
      },
      request,
    );
  }
}

export const PATCH = withRequestLogging(withRateLimit("admin:write", _PATCH));
