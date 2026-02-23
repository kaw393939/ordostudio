import { getSessionUserFromRequest } from "../../../../../../../lib/api/auth";
import { hal, problem } from "../../../../../../../lib/api/response";
import { NewsletterIssueNotFoundError, listNewsletterSendRuns } from "../../../../../../../lib/api/newsletter";
import { withRequestLogging } from "../../../../../../../lib/api/request-logging";

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

async function _GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = requireAdmin(request);
  if ("error" in auth) {
    return auth.error;
  }

  const { id } = await context.params;

  try {
    const runs = listNewsletterSendRuns(id);

    return hal(
      {
        count: runs.length,
        items: runs,
      },
      {
        self: { href: `/api/v1/admin/newsletter/${id}/send-runs` },
        "app:issue": { href: `/api/v1/admin/newsletter/${id}` },
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
        detail: "Unable to load send runs.",
      },
      request,
    );
  }
}

export const GET = withRequestLogging(_GET);
