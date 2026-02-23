import { getSessionUserFromRequest } from "../../../../../../../lib/api/auth";
import { problem } from "../../../../../../../lib/api/response";
import { exportNewsletterMarkdown, NewsletterIssueNotFoundError } from "../../../../../../../lib/api/newsletter";
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
    const baseUrl = new URL(request.url).origin;
    const md = exportNewsletterMarkdown({ id, baseUrl });
    return new Response(md, {
      status: 200,
      headers: {
        "content-type": "text/markdown; charset=utf-8",
        "content-disposition": `attachment; filename="ordo-brief-${id}.md"`,
        "cache-control": "no-store",
      },
    });
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
        detail: "Unable to export issue.",
      },
      request,
    );
  }
}

export const GET = withRequestLogging(_GET);
