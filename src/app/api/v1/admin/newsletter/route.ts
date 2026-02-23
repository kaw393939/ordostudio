import { getSessionUserFromRequest } from "../../../../../lib/api/auth";
import { hal, problem } from "../../../../../lib/api/response";
import { parsePayload } from "../../../../../lib/api/validate";
import { createNewsletterSchema } from "../../../../../lib/api/schemas";
import { createNewsletterIssue, listNewsletterIssues } from "../../../../../lib/api/newsletter";
import { asUserActor } from "../../../../../lib/api/actor";
import { withRequestLogging } from "../../../../../lib/api/request-logging";
import { withRateLimit } from "../../../../../lib/api/rate-limit-wrapper";

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
  if ("error" in auth) {
    return auth.error;
  }

  try {
    const result = listNewsletterIssues();
    return hal(
      {
        count: result.count,
        items: result.items,
      },
      {
        self: { href: "/api/v1/admin/newsletter" },
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
        detail: "Unable to load newsletter issues.",
      },
      request,
    );
  }
}

async function _POST(request: Request) {
  const auth = requireAdmin(request);
  if ("error" in auth) {
    return auth.error;
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

  const parsed = parsePayload(createNewsletterSchema, raw, request);
  if (!parsed.success) return parsed.response;

  try {
    const created = createNewsletterIssue({
      title: parsed.data.title ?? "",
      issueDate: parsed.data.issue_date ?? "",
      actor: asUserActor(auth.user.id),
      requestId: crypto.randomUUID(),
    });

    return hal(
      created,
      {
        self: { href: `/api/v1/admin/newsletter/${created.id}` },
        collection: { href: "/api/v1/admin/newsletter" },
      },
      { status: 201 },
    );
  } catch {
    return problem(
      {
        type: "https://lms-219.dev/problems/invalid-input",
        title: "Bad Request",
        status: 400,
        detail: "Invalid newsletter issue input.",
      },
      request,
    );
  }
}

export const GET = withRequestLogging(_GET);
export const POST = withRequestLogging(withRateLimit("admin:write", _POST));
