import { getSessionUserFromRequest, isSameOriginMutation } from "../../../../../../../lib/api/auth";
import { hal, problem } from "../../../../../../../lib/api/response";
import { markNewsletterReviewed, NewsletterIssueNotFoundError } from "../../../../../../../lib/api/newsletter";
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

  try {
    const updated = markNewsletterReviewed({
      id,
      actor: asUserActor(auth.user.id),
      requestId: crypto.randomUUID(),
    });

    return hal(
      updated,
      {
        self: { href: `/api/v1/admin/newsletter/${id}` },
        "app:publish": { href: `/api/v1/admin/newsletter/${id}/publish` },
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

    return problem(
      {
        type: "https://lms-219.dev/problems/internal",
        title: "Internal Server Error",
        status: 500,
        detail: "Unable to mark issue reviewed.",
      },
      request,
    );
  }
}

export const POST = withRequestLogging(withRateLimit("admin:write", _POST));
