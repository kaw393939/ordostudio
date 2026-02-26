/**
 * GET  /api/v1/crm/contacts/:id  — full contact detail (staff-only)
 * PATCH /api/v1/crm/contacts/:id  — update status, notes, assigned_to
 */

import { NextRequest } from "next/server";
import { getSessionUserFromRequest } from "@/lib/api/auth";
import { problem } from "@/lib/api/response";
import { getContact, updateContact, InvalidContactTransitionError } from "@/lib/api/contacts";
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
    const contact = getContact(db, id);
    if (!contact) {
      return problem(
        { type: "https://lms-219.dev/problems/not-found", title: "Not Found", status: 404, detail: `Contact ${id} not found.` },
        request,
      );
    }

    // Linked intake requests
    const intakes = db
      .prepare(`SELECT id, audience, contact_email, goals, status, created_at FROM intake_requests WHERE contact_id = ? ORDER BY created_at DESC`)
      .all(id) as Array<Record<string, unknown>>;

    // Bookings
    const bookings = db
      .prepare(
        `SELECT b.id, b.status, b.created_at, ma.start_at, ma.end_at
         FROM bookings b
         JOIN intake_requests ir ON b.intake_request_id = ir.id
         JOIN maestro_availability ma ON b.maestro_availability_id = ma.id
         WHERE ir.contact_id = ?
         ORDER BY b.created_at DESC`,
      )
      .all(id) as Array<Record<string, unknown>>;

    return Response.json({ ...contact, intakes, bookings });
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

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);
  try {
    const input: Record<string, unknown> = {};
    if ("status" in body) input["status"] = body["status"];
    if ("notes" in body) input["notes"] = body["notes"];
    if ("assigned_to" in body) input["assignedTo"] = body["assigned_to"] ?? null;
    if ("full_name" in body) input["fullName"] = body["full_name"] ?? null;

    const updated = updateContact(db, id, input as Parameters<typeof updateContact>[2]);
    if (!updated) {
      return problem(
        { type: "https://lms-219.dev/problems/not-found", title: "Not Found", status: 404, detail: `Contact ${id} not found.` },
        request,
      );
    }
    return Response.json(updated);
  } catch (err) {
    if (err instanceof InvalidContactTransitionError) {
      return Response.json({ error: err.message }, { status: 422 });
    }
    throw err;
  } finally {
    db.close();
  }
}

export const GET = withRequestLogging(_GET);
export const PATCH = withRequestLogging(_PATCH);
