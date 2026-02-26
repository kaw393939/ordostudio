/**
 * GET  /api/v1/admin/workflows — list all rules
 * POST /api/v1/admin/workflows — create a new rule
 *
 * Staff only (ADMIN | SUPER_ADMIN | MAESTRO)
 */

import { NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
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

async function _GET(request: NextRequest) {
  const auth = requireStaff(request);
  if (auth.error) return auth.error;

  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);
  try {
    const rules = db.prepare("SELECT * FROM workflow_rules ORDER BY position ASC").all();
    return Response.json({ rules, total: (rules as unknown[]).length });
  } finally {
    db.close();
  }
}

async function _POST(request: NextRequest) {
  const auth = requireStaff(request);
  if (auth.error) return auth.error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return problem(
      { type: "https://lms-219.dev/problems/bad-request", title: "Bad Request", status: 400, detail: "Invalid JSON body." },
      request,
    );
  }

  const {
    name,
    description,
    trigger_event,
    condition_json,
    action_type,
    action_config,
    enabled = 1,
    position = 0,
  } = body as Record<string, unknown>;

  if (!name || !trigger_event || !action_type || !action_config) {
    return problem(
      { type: "https://lms-219.dev/problems/bad-request", title: "Bad Request", status: 400, detail: "Required fields: name, trigger_event, action_type, action_config." },
      request,
    );
  }

  const id = randomUUID();
  const now = new Date().toISOString();

  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);
  try {
    db.prepare(
      `INSERT INTO workflow_rules (id, name, description, trigger_event, condition_json, action_type, action_config, enabled, position, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      id,
      name,
      description ?? null,
      trigger_event,
      condition_json ?? null,
      action_type,
      typeof action_config === "string" ? action_config : JSON.stringify(action_config),
      enabled ? 1 : 0,
      position,
      auth.user!.id,
      now,
      now,
    );

    const rule = db.prepare("SELECT * FROM workflow_rules WHERE id = ?").get(id);
    return Response.json(rule, { status: 201 });
  } finally {
    db.close();
  }
}

export const GET = withRequestLogging(_GET);
export const POST = withRequestLogging(_POST);
