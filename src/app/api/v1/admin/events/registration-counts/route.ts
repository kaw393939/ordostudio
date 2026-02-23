import { resolveConfig } from "@/platform/config";
import { openCliDb } from "@/platform/runtime";
import { getSessionUserFromRequest, isSameOriginMutation } from "../../../../../../lib/api/auth";
import { hal, problem } from "../../../../../../lib/api/response";
import { parsePayload } from "../../../../../../lib/api/validate";
import { registrationCountsSchema } from "../../../../../../lib/api/schemas";
import { withRequestLogging } from "../../../../../../lib/api/request-logging";
import { withRateLimit } from "../../../../../../lib/api/rate-limit-wrapper";

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

  const auth = requireAdmin(request);
  if (auth.error) {
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

  const parsed = parsePayload(registrationCountsSchema, raw, request);
  if (!parsed.success) return parsed.response;

  const slugs = (parsed.data.slugs ?? []).filter((slug) => typeof slug === "string" && slug.trim().length > 0);
  if (slugs.length === 0) {
    return hal(
      { items: [] },
      {
        self: { href: "/api/v1/admin/events/registration-counts" },
      },
      { headers: { "cache-control": "no-store" } },
    );
  }

  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);

  try {
    const placeholders = slugs.map(() => "?").join(",");
    const rows = db
      .prepare(
        `
SELECT
  e.slug AS slug,
  SUM(CASE WHEN r.status != 'CANCELLED' THEN 1 ELSE 0 END) AS count
FROM events e
LEFT JOIN event_registrations r ON r.event_id = e.id
WHERE e.slug IN (${placeholders})
GROUP BY e.slug
`,
      )
      .all(...slugs) as Array<{ slug: string; count: number | null }>;

    const bySlug = new Map(rows.map((row) => [row.slug, row.count ?? 0]));

    return hal(
      {
        items: slugs.map((slug) => ({ slug, count: bySlug.get(slug) ?? 0 })),
      },
      {
        self: { href: "/api/v1/admin/events/registration-counts" },
      },
      { headers: { "cache-control": "no-store" } },
    );
  } finally {
    db.close();
  }
}

export const POST = withRequestLogging(withRateLimit("admin:write", _POST));
