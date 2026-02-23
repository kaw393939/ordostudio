import {
  buildSessionCookie,
  EmailUnverifiedError,
  getAuthContext,
  InvalidCredentialsError,
  isSameOriginMutation,
  loginUser,
} from "../../../../../lib/api/auth";
import { hal, problem } from "../../../../../lib/api/response";
import { withRateLimit } from "../../../../../lib/api/rate-limit-wrapper";
import { parsePayload } from "../../../../../lib/api/validate";
import { loginSchema } from "../../../../../lib/api/schemas";
import { withRequestLogging } from "../../../../../lib/api/request-logging";

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

  const parsed = parsePayload(loginSchema, raw, request);
  if (!parsed.success) return parsed.response;

  try {
    const context = getAuthContext();
    const login = await loginUser(parsed.data.email, parsed.data.password, crypto.randomUUID(), request);

    return hal(
      {
        id: login.user.id,
        email: login.user.email,
        status: login.user.status,
        roles: login.user.roles,
      },
      {
        self: { href: "/api/v1/me" },
        logout: { href: "/api/v1/auth/logout" },
      },
      {
        headers: {
          "set-cookie": buildSessionCookie(login.sessionToken, context.env),
          "cache-control": "no-store",
        },
      },
    );
  } catch (error) {
    if (error instanceof EmailUnverifiedError) {
      return problem(
        {
          type: "https://lms-219.dev/problems/email-unverified",
          title: "Forbidden",
          status: 403,
          detail: "Email verification required before login.",
        },
        request,
        {
          headers: {
            "cache-control": "no-store",
          },
        },
      );
    }

    if (error instanceof InvalidCredentialsError) {
      return problem(
        {
          type: "https://lms-219.dev/problems/unauthorized",
          title: "Unauthorized",
          status: 401,
          detail: "Invalid credentials.",
        },
        request,
        {
          headers: {
            "cache-control": "no-store",
          },
        },
      );
    }

    return problem(
      {
        type: "https://lms-219.dev/problems/internal",
        title: "Internal Server Error",
        status: 500,
        detail: "Unable to login.",
      },
        request,
        {
          headers: {
            "cache-control": "no-store",
          },
        },
    );
  }
}

export const POST = withRequestLogging(withRateLimit("auth:login", _POST));
