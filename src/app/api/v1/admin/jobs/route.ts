import { getSessionUserFromRequest } from "@/lib/api/auth";
import { hal, problem } from "@/lib/api/response";
import { withRequestLogging } from "@/lib/api/request-logging";
import { getJobQueue } from "@/platform/resolve-job-queue";

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
  if ("error" in auth) return auth.error;

  try {
    const queue = getJobQueue();
    if (!queue) {
      return problem(
        {
          type: "https://lms-219.dev/problems/internal",
          title: "Service Unavailable",
          status: 503,
          detail: "Job queue not configured.",
        },
        request,
      );
    }

    const stats = queue.getStats();
    const recentFailed = queue.getRecentFailed(20);

    return hal(
      {
        stats,
        recentFailed: recentFailed.map((j) => ({
          id: j.id,
          type: j.type,
          status: j.status,
          attempts: j.attempts,
          maxRetries: j.maxRetries,
          lastError: j.lastError,
          createdAt: j.createdAt,
          failedAt: j.failedAt,
        })),
      },
      { self: { href: "/api/v1/admin/jobs" } },
    );
  } catch {
    return problem(
      {
        type: "https://lms-219.dev/problems/internal",
        title: "Internal Server Error",
        status: 500,
        detail: "Job queue not available.",
      },
      request,
    );
  }
}

export const GET = withRequestLogging(_GET);
