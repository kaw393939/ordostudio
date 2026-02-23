import { getSessionUserFromRequest } from "../../../../../lib/api/auth";
import { hal, problem } from "../../../../../lib/api/response";
import { getReferralAdminReport } from "../../../../../lib/api/referrals";
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
    const report = getReferralAdminReport();
    return hal(
      report,
      {
        self: { href: "/api/v1/admin/referrals" },
        me: { href: "/api/v1/me" },
        "app:export": { href: "/api/v1/admin/referrals/export" },
      },
      {
        headers: {
          "cache-control": "no-store",
        },
      },
    );
  } catch {
    return problem(
      {
        type: "https://lms-219.dev/problems/internal",
        title: "Internal Server Error",
        status: 500,
        detail: "Unable to load referral report.",
      },
      request,
    );
  }
}

export const GET = withRequestLogging(_GET);
