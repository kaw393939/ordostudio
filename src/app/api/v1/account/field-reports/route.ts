import { getSessionUserFromRequest, isSameOriginMutation } from "../../../../../lib/api/auth";
import { hal, problem } from "../../../../../lib/api/response";
import { parsePayload } from "../../../../../lib/api/validate";
import { fieldReportSchema } from "../../../../../lib/api/schemas";
import { createFieldReport, InvalidFieldReportInputError, listFieldReportsForUser } from "../../../../../lib/api/field-reports";
import { withRequestLogging } from "../../../../../lib/api/request-logging";
import { withRateLimit } from "../../../../../lib/api/rate-limit-wrapper";

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

  const { searchParams } = new URL(request.url);
  const limit = searchParams.get("limit");
  const offset = searchParams.get("offset");

  try {
    const result = listFieldReportsForUser({
      userId: user.id,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });

    return hal(
      {
        count: result.count,
        limit: result.limit,
        offset: result.offset,
        items: result.items,
      },
      {
        self: { href: "/api/v1/account/field-reports" },
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
        detail: "Unable to load field reports.",
      },
      request,
    );
  }
}

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

  const parsed = parsePayload(fieldReportSchema, raw, request);
  if (!parsed.success) return parsed.response;

  try {
    const created = createFieldReport({
      userId: user.id,
      eventSlug: parsed.data.event_slug ?? "",
      keyInsights: parsed.data.key_insights ?? "",
      models: parsed.data.models ?? "",
      money: parsed.data.money ?? "",
      people: parsed.data.people ?? "",
      whatITried: parsed.data.what_i_tried ?? "",
      clientAdvice: parsed.data.client_advice ?? "",
      summary: parsed.data.summary,
      requestId: crypto.randomUUID(),
    });

    return hal(
      created,
      {
        self: { href: "/api/v1/account/field-reports" },
        "app:field-reports": { href: "/api/v1/account/field-reports" },
      },
      {
        status: 201,
        headers: {
          "cache-control": "no-store",
        },
      },
    );
  } catch (error) {
    if (error instanceof InvalidFieldReportInputError) {
      return problem(
        {
          type: "https://lms-219.dev/problems/invalid-input",
          title: "Bad Request",
          status: 400,
          detail: `Invalid field report input: ${error.reason}`,
        },
        request,
      );
    }

    return problem(
      {
        type: "https://lms-219.dev/problems/internal",
        title: "Internal Server Error",
        status: 500,
        detail: "Unable to submit field report.",
      },
      request,
    );
  }
}

export const GET = withRequestLogging(_GET);
export const POST = withRequestLogging(withRateLimit("user:write", _POST));
