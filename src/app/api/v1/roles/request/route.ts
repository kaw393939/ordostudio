import { getSessionUserFromRequest } from "../../../../../lib/api/auth";
import { hal, problem } from "../../../../../lib/api/response";
import { withRequestLogging } from "../../../../../lib/api/request-logging";
import { createRoleRequest, getRoleByName, getPendingRoleRequest } from "../../../../../lib/api/roles";
import { openCliDb } from "../../../../../platform/runtime";
import { resolveConfig } from "../../../../../platform/config";
import { writeFeedEvent } from "../../../../../lib/api/feed-events";
import { z } from "zod";

const requestSchema = z.object({
  requested_role_name: z.string(),
  context: z.any().optional(),
});

async function _POST(request: Request) {
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

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return problem(
      {
        type: "https://lms-219.dev/problems/bad-request",
        title: "Bad Request",
        status: 400,
        detail: "Invalid JSON payload.",
      },
      request
    );
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return problem(
      {
        type: "https://lms-219.dev/problems/bad-request",
        title: "Bad Request",
        status: 400,
        detail: "Invalid request payload.",
        errors: parsed.error.issues,
      },
      request
    );
  }

  const { requested_role_name, context } = parsed.data;

  // Check if role exists
  const db = openCliDb(resolveConfig({ envVars: process.env }));
  let role: { id: string } | undefined;
  try {
    role = db.prepare("SELECT id FROM roles WHERE name = ?").get(requested_role_name) as { id: string } | undefined;
  } finally {
    db.close();
  }
  if (!role) {
    return problem(
      {
        type: "https://lms-219.dev/problems/bad-request",
        title: "Bad Request",
        status: 400,
        detail: "Invalid requested_role_name.",
      },
      request
    );
  }

  // Check if already pending
  const existing = getPendingRoleRequest(user.id, role.id);
  if (existing) {
    return problem(
      {
        type: "https://lms-219.dev/problems/conflict",
        title: "Conflict",
        status: 409,
        detail: "A pending request for this role already exists.",
      },
      request
    );
  }

  const roleRequest = createRoleRequest(user.id, role.id, context || {});

  // Write feed event for the applicant
  try {
    const feedDb = openCliDb(resolveConfig({ envVars: process.env }));
    writeFeedEvent(feedDb, {
      userId: user.id,
      type: "RoleRequestUpdate",
      title: "Application submitted — pending review.",
      description: `Your application for ${requested_role_name} is being reviewed.`,
    });
    feedDb.close();
  } catch (e) {
    console.error("Failed to write feed event for role request submission:", e);
  }

  return new Response(JSON.stringify(roleRequest), {
    status: 201,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

export const POST = withRequestLogging(_POST);
