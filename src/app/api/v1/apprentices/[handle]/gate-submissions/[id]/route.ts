import { getSessionUserFromRequest, isSameOriginMutation } from "../../../../../../../lib/api/auth";
import { hal, problem } from "../../../../../../../lib/api/response";
import { parsePayload } from "../../../../../../../lib/api/validate";
import { reviewGateSubmissionSchema } from "../../../../../../../lib/api/schemas";
import {
  reviewGateSubmission,
  GateSubmissionNotFoundError,
} from "../../../../../../../lib/api/apprentice-progress";
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

async function _PATCH(request: Request, context: { params: Promise<{ handle: string; id: string }> }) {
  const { handle, id } = await context.params;

  const auth = requireAdmin(request);
  if ("error" in auth) return auth.error;

  const sameOrigin = await isSameOriginMutation(request);
  if (!sameOrigin) {
    return problem(
      {
        type: "https://lms-219.dev/problems/forbidden",
        title: "Forbidden",
        status: 403,
        detail: "Cross-origin mutation rejected.",
      },
      request,
    );
  }

  const raw = await request.json();
  const parsed = parsePayload(reviewGateSubmissionSchema, raw, request);
  if (!parsed.success) {
    return parsed.response;
  }

  const requestId = crypto.randomUUID();

  try {
    const submission = reviewGateSubmission({
      submissionId: id,
      reviewerId: auth.user.id,
      status: parsed.data.status,
      reviewerNotes: parsed.data.reviewer_notes ?? undefined,
      requestId,
    });

    return hal(
      {
        id: submission.id,
        status: submission.status,
        reviewer_notes: submission.reviewer_notes,
        reviewed_at: submission.reviewed_at,
      },
      {
        self: { href: `/api/v1/apprentices/${handle}/gate-submissions/${id}` },
        submissions: { href: `/api/v1/apprentices/${handle}/gate-submissions` },
      },
    );
  } catch (error) {
    if (error instanceof GateSubmissionNotFoundError) {
      return problem(
        {
          type: "https://lms-219.dev/problems/not-found",
          title: "Not Found",
          status: 404,
          detail: "Gate submission not found.",
        },
        request,
      );
    }
    return problem(
      {
        type: "https://lms-219.dev/problems/internal",
        title: "Internal Server Error",
        status: 500,
        detail: "Unable to review gate submission.",
      },
      request,
    );
  }
}

export const PATCH = withRequestLogging(withRateLimit("admin:write", _PATCH));
