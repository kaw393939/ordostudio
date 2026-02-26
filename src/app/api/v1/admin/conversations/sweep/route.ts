/**
 * POST /api/v1/admin/conversations/sweep
 *
 * Marks stale ACTIVE conversations as ABANDONED, extracts partial signals,
 * creates CRM contacts where possible, and fires feed events to admin users.
 *
 * Designed to be called by a cron job (e.g. every 15 minutes) or manually
 * from the admin panel. Idempotent — running it twice sweeps zero on the
 * second pass.
 */

import { getSessionUserFromRequest } from "@/lib/api/auth";
import { problem } from "@/lib/api/response";
import { withRequestLogging } from "@/lib/api/request-logging";
import { sweepAbandonedConversations } from "@/lib/api/conversation-sweep";

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
  const auth = requireAdmin(request);
  if ("error" in auth) return auth.error;

  const requestId = crypto.randomUUID();

  try {
    const result = sweepAbandonedConversations(requestId);
    return Response.json({ ok: true, ...result, requestId }, { status: 200 });
  } catch {
    return problem(
      {
        type: "https://lms-219.dev/problems/internal",
        title: "Internal Server Error",
        status: 500,
        detail: "Conversation sweep failed.",
      },
      request,
    );
  }
}

export const POST = withRequestLogging(_POST);
