import { getSessionUserFromRequest } from "../../../../../lib/api/auth";
import { getFollowUpAdminReport } from "../../../../../lib/api/engagements";
import { hal, problem } from "../../../../../lib/api/response";
import { withRequestLogging } from "../../../../../lib/api/request-logging";

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
  if ("error" in auth) {
    return auth.error;
  }

  try {
    const report = getFollowUpAdminReport();
    return hal(report as unknown as Record<string, unknown>, {
      self: { href: "/api/v1/admin/engagement-followup" },
      account_engagements: { href: "/api/v1/account/engagements" },
    });
  } catch {
    return problem(
      {
        type: "https://lms-219.dev/problems/internal",
        title: "Internal Server Error",
        status: 500,
        detail: "Unable to load follow-up report.",
      },
      request,
    );
  }
}

export const GET = withRequestLogging(_GET);
