import { getSessionUserFromRequest, isSameOriginMutation } from "../../../../../../lib/api/auth";
import { hal, problem } from "../../../../../../lib/api/response";
import { parsePayload } from "../../../../../../lib/api/validate";
import { updateNewsletterSchema } from "../../../../../../lib/api/schemas";
import { getNewsletterIssue, NewsletterIssueNotFoundError, updateNewsletterIssue } from "../../../../../../lib/api/newsletter";
import { asUserActor } from "../../../../../../lib/api/actor";
import { withRequestLogging } from "../../../../../../lib/api/request-logging";
import { withRateLimit } from "../../../../../../lib/api/rate-limit-wrapper";

const ALLOWED_SECTIONS = ["MODELS", "MONEY", "PEOPLE", "FROM_FIELD", "NEXT_STEPS"] as const;
type AllowedSection = (typeof ALLOWED_SECTIONS)[number];

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

async function _GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = requireAdmin(request);
  if ("error" in auth) {
    return auth.error;
  }

  const { id } = await context.params;

  try {
    const issue = getNewsletterIssue(id);
    return hal(
      issue,
      {
        self: { href: `/api/v1/admin/newsletter/${id}` },
        collection: { href: "/api/v1/admin/newsletter" },
      },
      {
        headers: {
          "cache-control": "no-store",
        },
      },
    );
  } catch (error) {
    if (error instanceof NewsletterIssueNotFoundError) {
      return problem(
        {
          type: "https://lms-219.dev/problems/not-found",
          title: "Not Found",
          status: 404,
          detail: "Newsletter issue not found.",
        },
        request,
      );
    }

    return problem(
      {
        type: "https://lms-219.dev/problems/internal",
        title: "Internal Server Error",
        status: 500,
        detail: "Unable to load newsletter issue.",
      },
      request,
    );
  }
}

async function _PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
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

  const auth = requireAdmin(request);
  if ("error" in auth) {
    return auth.error;
  }

  const { id } = await context.params;

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

  const parsed = parsePayload(updateNewsletterSchema, raw, request);
  if (!parsed.success) return parsed.response;

  try {
    const blocks = (() => {
      const next: Partial<Record<AllowedSection, string>> = {};
      const raw = parsed.data.blocks;
      if (!raw || typeof raw !== "object") {
        return next;
      }

      for (const section of ALLOWED_SECTIONS) {
        const value = (raw as Record<string, unknown>)[section];
        if (typeof value === "string") {
          next[section] = value;
        }
      }

      return next;
    })();

    const updated = updateNewsletterIssue({
      id,
      title: parsed.data.title,
      issueDate: parsed.data.issue_date,
      blocks,
      actor: asUserActor(auth.user.id),
      requestId: crypto.randomUUID(),
    });

    return hal(
      updated,
      {
        self: { href: `/api/v1/admin/newsletter/${id}` },
        collection: { href: "/api/v1/admin/newsletter" },
      },
      {
        headers: {
          "cache-control": "no-store",
        },
      },
    );
  } catch (error) {
    if (error instanceof NewsletterIssueNotFoundError) {
      return problem(
        {
          type: "https://lms-219.dev/problems/not-found",
          title: "Not Found",
          status: 404,
          detail: "Newsletter issue not found.",
        },
        request,
      );
    }

    return problem(
      {
        type: "https://lms-219.dev/problems/internal",
        title: "Internal Server Error",
        status: 500,
        detail: "Unable to update newsletter issue.",
      },
      request,
    );
  }
}

export const GET = withRequestLogging(_GET);
export const PATCH = withRequestLogging(withRateLimit("admin:write", _PATCH));
