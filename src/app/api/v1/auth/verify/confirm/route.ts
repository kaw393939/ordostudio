import {
  InvalidVerifyTokenError,
  VerifyTokenExpiredError,
  VerifyTokenInvalidError,
  VerifyTokenUsedError,
  confirmEmailVerification,
  isSameOriginMutation,
} from "../../../../../../lib/api/auth";
import { hal, problem } from "../../../../../../lib/api/response";
import { parsePayload } from "../../../../../../lib/api/validate";
import { verifyConfirmSchema } from "../../../../../../lib/api/schemas";
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

  const parsed = parsePayload(verifyConfirmSchema, raw, request);
  if (!parsed.success) return parsed.response;

  try {
    await confirmEmailVerification(parsed.data.token, crypto.randomUUID());
    return hal(
      { verified: true },
      {
        self: { href: "/api/v1/auth/verify/confirm" },
        login: { href: "/api/v1/auth/login" },
      },
      {
        headers: {
          "cache-control": "no-store",
        },
      },
    );
  } catch (error) {
    if (error instanceof InvalidVerifyTokenError) {
      return problem(
        {
          type: "https://lms-219.dev/problems/invalid-input",
          title: "Bad Request",
          status: 400,
          detail: "token is required.",
        },
        request,
      );
    }

    if (error instanceof VerifyTokenInvalidError) {
      return problem(
        {
          type: "https://lms-219.dev/problems/not-found",
          title: "Not Found",
          status: 404,
          detail: "Verification token not found.",
        },
        request,
      );
    }

    if (error instanceof VerifyTokenExpiredError) {
      return problem(
        {
          type: "https://lms-219.dev/problems/precondition-failed",
          title: "Precondition Failed",
          status: 412,
          detail: "Verification token is expired.",
        },
        request,
      );
    }

    if (error instanceof VerifyTokenUsedError) {
      return problem(
        {
          type: "https://lms-219.dev/problems/conflict",
          title: "Conflict",
          status: 409,
          detail: "Verification token already used.",
        },
        request,
      );
    }

    return problem(
      {
        type: "https://lms-219.dev/problems/internal",
        title: "Internal Server Error",
        status: 500,
        detail: "Unable to verify email.",
      },
      request,
    );
  }
}

export const POST = withRequestLogging(withRateLimit("auth:verify", _POST));
