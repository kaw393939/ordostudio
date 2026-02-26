/**
 * GET    /api/v1/admin/workflows/:id — get single rule
 * PATCH  /api/v1/admin/workflows/:id — update rule (incl. toggle enabled)
 * DELETE /api/v1/admin/workflows/:id — delete rule
 *
 * Staff only (ADMIN | SUPER_ADMIN | MAESTRO)
 */

import { NextRequest } from "next/server";
import { getSessionUserFromRequest } from "@/lib/api/auth";
import { problem } from "@/lib/api/response";
import { openCliDb } from "@/platform/runtime";
import { resolveConfig } from "@/platform/config";
import { withRequestLogging } from "@/lib/api/request-logging";

function requireStaff(request: Request) {
  const user = getSessionUserFromRequest(request);
  if (!user) {
    return {
      error: problem(
        { type: "https://lms-219.dev/problems/unauthorized", title: "Unauthorized", status: 401, detail: "Active session required." },
        request,
      ),
    };
  }
  const isStaff =
    user.roles.includes("ADMIN") ||
    user.roles.includes("SUPER_ADMIN") ||
    user.roles.includes("MAESTRO");
  if (!isStaff) {
    return {
      error: problem(
        { type: "https://lms-219.dev/problems/forbidden", title: "Forbidden", status: 403, detail: "Staff access required." },
        request,
      ),
    };
  }
  return { user };
}

async function _GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = requireStaff(request);
  if (auth.error) return auth.error;

  const { id } = await context.params;
  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);
  try {
    const rule = db.prepare("SELECT * FROM workflow_rules WHERE id = ?").get(id);
    if (!rule) {
      return problem(
        { type: "https://lms-219.dev/problems/not-found", title: "Not Found", status: 404, detail: `Rule '${id}' not found.` },
        request,
      );
    }
    return Response.json(rule);
  } finally {
    db.close();
  }
}

async function _PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = requireStaff(request);
  if (auth.error) return auth.error;

  const { id } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return problem(
      { type: "https://lms-219.dev/problems/bad-request", title: "Bad Request", status: 400, detail: "Invalid JSON body." },
      request,
    );
  }

  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);
  try {
    const existing = db.prepare("SELECT id FROM workflow_rules WHERE id = ?").get(id);
    if (!existing) {
      return problem(
        { type: "https://lms-219.dev/problems/not-found", title: "Not Found", status: 404, detail: `Rule '${id}' not found.` },
        request,
      );
    }

    const updates = body as Record<string, unknown>;
    const allowed = ["name", "description", "trigger_event", "condition_json", "action_type", "action_config", "enabled", "position"];
    const setClauses: string[] = [];
    const values: unknown[] = [];

    for (const key of allowed) {
      if (key in updates) {
        if (key === "enabled") {
          setClauses.push(`${key} = ?`);
          values.push(updates[key] ? 1 : 0);
        } else {
          setClauses.push(`${key} = ?`);
          values.push(updates[key] ?? null);
        }
      }
    }

    if (setClauses.length > 0) {
      setClauses.push("updated_at = ?");
      values.push(new Date().toISOString());
      values.push(id);
      db.prepare(`UPDATE workflow_rules SET ${setClauses.join(", ")} WHERE id = ?`).run(...values);
    }

    const rule = db.prepare("SELECT * FROM workflow_rules WHERE id = ?").get(id);
    return Response.json(rule);
  } finally {
    db.close();
  }
}

async function _DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = requireStaff(request);
  if (auth.error) return auth.error;

  const { id } = await context.params;
  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);
  try {
    const existing = db.prepare("SELECT id FROM workflow_rules WHERE id = ?").get(id);
    if (!existing) {
      return problem(
        { type: "https://lms-219.dev/problems/not-found", title: "Not Found", status: 404, detail: `Rule '${id}' not found.` },
        request,
      );
    }
    db.prepare("DELETE FROM workflow_rules WHERE id = ?").run(id);
    return new Response(null, { status: 204 });
  } finally {
    db.close();
  }
}

export const GET = withRequestLogging(_GET);
export const PATCH = withRequestLogging(_PATCH);
export const DELETE = withRequestLogging(_DELETE);
