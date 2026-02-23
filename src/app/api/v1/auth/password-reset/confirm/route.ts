import { hal, problem } from "../../../../../../lib/api/response";
import {
  InvalidPasswordResetPayloadError,
  ResetTokenExpiredError,
  ResetTokenInvalidError,
  ResetTokenUsedError,
  confirmPasswordReset,
  isSameOriginMutation,
} from "../../../../../../lib/api/auth";
import { parsePayload } from "../../../../../../lib/api/validate";
import { passwordResetConfirmSchema } from "../../../../../../lib/api/schemas";
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

  const parsed = parsePayload(passwordResetConfirmSchema, raw, request);
  if (!parsed.success) return parsed.response;

  try {
    await confirmPasswordReset(parsed.data.token, parsed.data.password, crypto.randomUUID());
    return hal(
      {
        reset: true,
      },
      {
        self: { href: "/api/v1/auth/password-reset/confirm" },
        login: { href: "/api/v1/auth/login" },
      },
      {
        headers: {
          "cache-control": "no-store",
        },
      },
    );
  } catch (error) {
    if (error instanceof InvalidPasswordResetPayloadError) {
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

    if (error instanceof ResetTokenInvalidError) {
      return problem(
        {
          type: "https://lms-219.dev/problems/not-found",
          title: "Not Found",
          status: 404,
          detail: "Reset token not found.",
        },
        request,
      );
    }

    if (error instanceof ResetTokenExpiredError) {
      return problem(
        {
          type: "https://lms-219.dev/problems/precondition-failed",
          title: "Precondition Failed",
          status: 412,
          detail: "Reset token is expired.",
        },
        request,
      );
    }

    if (error instanceof ResetTokenUsedError) {
      return problem(
        {
          type: "https://lms-219.dev/problems/conflict",
          title: "Conflict",
          status: 409,
          detail: "Reset token already used.",
        },
        request,
      );
    }

    return problem(
      {
        type: "https://lms-219.dev/problems/internal",
        title: "Internal Server Error",
        status: 500,
        detail: "Unable to reset password.",
      },
      request,
    );
  }
}

export const POST = withRequestLogging(withRateLimit("auth:verify", _POST));
