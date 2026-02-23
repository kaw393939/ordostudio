import { getSessionUserFromRequest } from "../../../../../lib/api/auth";
import { getAccountAttentionSummary } from "../../../../../lib/api/engagements";
import { hal, problem } from "../../../../../lib/api/response";
import { withRequestLogging } from "../../../../../lib/api/request-logging";

async function _GET(request: Request) {
  const user = getSessionUserFromRequest(request);
  if (!user) {
    return problem(
      {
        type: "https://lms-219.dev/problems/unauthorized",
        title: "Unauthorized",
        status: 401,
        detail: "Active session required.",
      },
      request,
    );
  }

  try {
    const summary = getAccountAttentionSummary(user.id);
    const badge_count = summary.overdue_actions + summary.pending_reminders;

    return hal(
      {
        ...summary,
        badge_count,
      },
      {
        self: { href: "/api/v1/account/attention" },
        me: { href: "/api/v1/me" },
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
        detail: "Unable to load attention summary.",
      },
      request,
    );
  }
}

export const GET = withRequestLogging(_GET);
