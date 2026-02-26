/**
 * POST /api/v1/crm/contacts/:id/provision
 *
 * Staff-only. Creates a user account for a QUALIFIED contact and starts
 * their onboarding workflow. Idempotent.
 */

import { NextRequest } from "next/server";
import { getSessionUserFromRequest } from "@/lib/api/auth";
import { problem } from "@/lib/api/response";
import { provisionAccount, ContactNotFoundError, ContactNotQualifiedError } from "@/lib/api/provisioning";
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

async function _POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = requireStaff(request);
  if (auth.error) return auth.error;

  const { id } = await context.params;

  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);
  try {
    const result = await provisionAccount(db, id);

    if (result.alreadyExisted) {
      return Response.json(
        { user_id: result.userId, email: result.email, already_existed: true },
        { status: 409 },
      );
    }

    return Response.json(
      { user_id: result.userId, email: result.email, already_existed: false },
      { status: 201 },
    );
  } catch (err) {
    if (err instanceof ContactNotFoundError) {
      return problem(
        { type: "https://lms-219.dev/problems/not-found", title: "Not Found", status: 404, detail: err.message },
        request,
      );
    }
    if (err instanceof ContactNotQualifiedError) {
      return problem(
        { type: "https://lms-219.dev/problems/invalid-state", title: "Conflict", status: 400, detail: err.message },
        request,
      );
    }
    throw err;
  } finally {
    db.close();
  }
}

export const POST = withRequestLogging(_POST);
