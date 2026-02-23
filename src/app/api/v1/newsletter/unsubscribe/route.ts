import { isSameOriginMutation } from "../../../../../lib/api/auth";
import { unsubscribeNewsletter } from "../../../../../lib/api/newsletter";
import { hal, problem } from "../../../../../lib/api/response";
import { parsePayload } from "../../../../../lib/api/validate";
import { unsubscribeSchema } from "../../../../../lib/api/schemas";
import { withRequestLogging } from "../../../../../lib/api/request-logging";
import { withRateLimit } from "../../../../../lib/api/rate-limit-wrapper";

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

  const parsed = parsePayload(unsubscribeSchema, raw, request);
  if (!parsed.success) return parsed.response;

  try {
    unsubscribeNewsletter({ token: parsed.data.token ?? "", requestId: crypto.randomUUID() });

    return hal(
      { ok: true },
      {
        self: { href: "/api/v1/newsletter/unsubscribe" },
      },
      {
        headers: {
          "cache-control": "no-store",
        },
      },
    );
  } catch (error) {
    if (error instanceof Error && error.message === "invalid_unsubscribe_token") {
      return problem(
        {
          type: "https://lms-219.dev/problems/invalid-input",
          title: "Bad Request",
          status: 400,
          detail: "Invalid or expired unsubscribe token.",
        },
        request,
      );
    }

    return problem(
      {
        type: "https://lms-219.dev/problems/internal",
        title: "Internal Server Error",
        status: 500,
        detail: "Unable to unsubscribe.",
      },
      request,
    );
  }
}

export const POST = withRequestLogging(withRateLimit("public:write", _POST));
