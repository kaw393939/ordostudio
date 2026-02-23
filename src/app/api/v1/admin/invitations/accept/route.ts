import {
  ExistingAccountError,
  InvalidInvitationPayloadError,
  InvitationExpiredError,
  InvitationNotFoundError,
  InvitationUsedError,
  acceptAdminInvitation,
} from "../../../../../../lib/api/invitations";
import { hal, problem } from "../../../../../../lib/api/response";
import { parsePayload } from "../../../../../../lib/api/validate";
import { acceptInvitationSchema } from "../../../../../../lib/api/schemas";
import { isSameOriginMutation } from "../../../../../../lib/api/auth";
import { withRequestLogging } from "../../../../../../lib/api/request-logging";
import { withRateLimit } from "../../../../../../lib/api/rate-limit-wrapper";

async function _POST(request: Request) {
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

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return problem(
      {
        type: "https://lms-219.dev/problems/invalid-json",
        title: "Bad Request",
        status: 400,
        detail: "Request body must be valid JSON.",
      },
      request,
    );
  }

  const parsed = parsePayload(acceptInvitationSchema, raw, request);
  if (!parsed.success) return parsed.response;

  try {
    const accepted = await acceptAdminInvitation(parsed.data.token, parsed.data.password, crypto.randomUUID());

    return hal(
      {
        id: accepted.id,
        email: accepted.email,
        role: accepted.role,
      },
      {
        self: { href: "/api/v1/admin/invitations/accept" },
        login: { href: "/api/v1/auth/login" },
      },
    );
  } catch (error) {
    if (error instanceof InvalidInvitationPayloadError) {
      return problem(
        {
          type: "https://lms-219.dev/problems/invalid-input",
          title: "Bad Request",
          status: 400,
          detail: "token and password are required.",
        },
        request,
      );
    }

    if (error instanceof InvitationNotFoundError) {
      return problem(
        {
          type: "https://lms-219.dev/problems/not-found",
          title: "Not Found",
          status: 404,
          detail: "Invitation not found.",
        },
        request,
      );
    }

    if (error instanceof InvitationExpiredError) {
      return problem(
        {
          type: "https://lms-219.dev/problems/precondition-failed",
          title: "Precondition Failed",
          status: 412,
          detail: "Invitation is expired.",
        },
        request,
      );
    }

    if (error instanceof InvitationUsedError || error instanceof ExistingAccountError) {
      return problem(
        {
          type: "https://lms-219.dev/problems/conflict",
          title: "Conflict",
          status: 409,
          detail: "Invitation cannot be accepted.",
        },
        request,
      );
    }

    return problem(
      {
        type: "https://lms-219.dev/problems/internal",
        title: "Internal Server Error",
        status: 500,
        detail: "Unable to accept invitation.",
      },
      request,
    );
  }
}

export const POST = withRequestLogging(withRateLimit("admin:write", _POST));
