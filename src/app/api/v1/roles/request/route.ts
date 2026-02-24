import { getSessionUserFromRequest } from "../../../../../lib/api/auth";
import { hal, problem } from "../../../../../lib/api/response";
import { withRequestLogging } from "../../../../../lib/api/request-logging";
import { createRoleRequest, getRoleByName, getPendingRoleRequest } from "../../../../../lib/api/roles";
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
  const db = require("../../../../../platform/runtime").openCliDb(require("../../../../../platform/config").resolveConfig({ envVars: process.env }));
  const role = db.prepare("SELECT id FROM roles WHERE name = ?").get(requested_role_name);
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

  return new Response(JSON.stringify(roleRequest), {
    status: 201,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

export const POST = withRequestLogging(_POST);
