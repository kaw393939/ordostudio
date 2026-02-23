import { getSessionUserFromRequest, isSameOriginMutation } from "../../../../../../lib/api/auth";
import { hal, problem } from "../../../../../../lib/api/response";
import { parsePayload } from "../../../../../../lib/api/validate";
import { gateSubmissionSchema } from "../../../../../../lib/api/schemas";
import {
  createGateSubmission,
  GateProjectNotFoundError,
} from "../../../../../../lib/api/apprentice-progress";
import { getPublicApprenticeByHandle, ApprenticeProfileNotFoundError } from "../../../../../../lib/api/apprentices";
import { withRequestLogging } from "../../../../../../lib/api/request-logging";
import { withRateLimit } from "../../../../../../lib/api/rate-limit-wrapper";

async function _POST(request: Request, context: { params: Promise<{ handle: string }> }) {
  const { handle } = await context.params;

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

  // Verify the handle belongs to this user
  let profile;
  try {
    profile = getPublicApprenticeByHandle(handle);
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
    throw error;
  }

  if (profile.user_id !== user.id) {
    return problem(
      {
        type: "https://lms-219.dev/problems/forbidden",
        title: "Forbidden",
        status: 403,
        detail: "You can only submit gate projects for your own profile.",
      },
      request,
    );
  }

  const raw = await request.json();
  const parsed = parsePayload(gateSubmissionSchema, raw, request);
  if (!parsed.success) {
    return parsed.response;
  }

  const requestId = crypto.randomUUID();

  try {
    const submission = createGateSubmission({
      userId: user.id,
      gateProjectSlug: parsed.data.gate_project_slug,
      submissionUrl: parsed.data.submission_url ?? undefined,
      submissionNotes: parsed.data.submission_notes ?? undefined,
      requestId,
    });

    return hal(
      {
        id: submission.id,
        gate_project_id: submission.gate_project_id,
        status: submission.status,
        submission_url: submission.submission_url,
        submission_notes: submission.submission_notes,
        created_at: submission.created_at,
      },
      {
        self: { href: `/api/v1/apprentices/${handle}/gate-submissions` },
        profile: { href: `/api/v1/apprentices/${handle}` },
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof GateProjectNotFoundError) {
      return problem(
        {
          type: "https://lms-219.dev/problems/not-found",
          title: "Not Found",
          status: 404,
          detail: "Gate project not found.",
        },
        request,
      );
    }
    return problem(
      {
        type: "https://lms-219.dev/problems/internal",
        title: "Internal Server Error",
        status: 500,
        detail: "Unable to create gate submission.",
      },
      request,
    );
  }
}

export const POST = withRequestLogging(withRateLimit("user:write", _POST));
