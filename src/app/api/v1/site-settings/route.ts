import { getSessionUserFromRequest } from "../../../../lib/api/auth";
import {
  getSiteSettings,
  setSiteSetting,
  ALLOWED_SITE_SETTING_KEYS,
} from "../../../../lib/api/site-settings";
import { problem } from "../../../../lib/api/response";
import { withRequestLogging } from "../../../../lib/api/request-logging";
import { openCliDb } from "../../../../platform/runtime";
import { resolveConfig } from "../../../../platform/config";

function requireAdmin(request: Request) {
  const user = getSessionUserFromRequest(request);
  if (!user) {
    return problem(
      {
        type: "https://lms-219.dev/problems/unauthorized",
        title: "Unauthorized",
        status: 401,
        detail: "Active session required.",
      },
      request
    );
  }
  if (!user.roles.includes("ADMIN") && !user.roles.includes("SUPER_ADMIN")) {
    return problem(
      {
        type: "https://lms-219.dev/problems/forbidden",
        title: "Forbidden",
        status: 403,
        detail: "Admin role required.",
      },
      request
    );
  }
  return null;
}

async function _GET(request: Request) {
  const authError = requireAdmin(request);
  if (authError) return authError;

  const db = openCliDb(resolveConfig({ envVars: process.env }));
  try {
    const settings = getSiteSettings(db);
    return Response.json({ settings }, { status: 200 });
  } finally {
    db.close();
  }
}

async function _PATCH(request: Request) {
  const authError = requireAdmin(request);
  if (authError) return authError;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return problem(
      {
        type: "https://lms-219.dev/problems/bad-request",
        title: "Bad Request",
        status: 400,
        detail: "Request body must be valid JSON.",
      },
      request
    );
  }

  const unknownKeys = Object.keys(body).filter(
    (k) => !ALLOWED_SITE_SETTING_KEYS.includes(k)
  );
  if (unknownKeys.length > 0) {
    return problem(
      {
        type: "https://lms-219.dev/problems/unprocessable-entity",
        title: "Unprocessable Entity",
        status: 422,
        detail: `Unknown setting key(s): ${unknownKeys.join(", ")}`,
      },
      request
    );
  }

  const db = openCliDb(resolveConfig({ envVars: process.env }));
  try {
    for (const [key, value] of Object.entries(body)) {
      if (typeof value === "string") {
        setSiteSetting(db, key, value);
      }
    }
    const settings = getSiteSettings(db);
    return Response.json({ settings }, { status: 200 });
  } finally {
    db.close();
  }
}

export const GET = withRequestLogging(_GET);
export const PATCH = withRequestLogging(_PATCH);
