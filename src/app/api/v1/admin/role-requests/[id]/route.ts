import { getSessionUserFromRequest } from "../../../../../../lib/api/auth";
import { hal, problem } from "../../../../../../lib/api/response";
import { withRequestLogging } from "../../../../../../lib/api/request-logging";
import { updateRoleRequestStatus } from "../../../../../../lib/api/roles";
import { resolveTransactionalEmailPort } from "../../../../../../platform/email";
import { openCliDb } from "../../../../../../platform/runtime";
import { resolveConfig } from "../../../../../../platform/config";
import { writeFeedEvent } from "../../../../../../lib/api/feed-events";
import { z } from "zod";

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

  if (!user.roles.includes("SUPER_ADMIN") && !user.roles.includes("ADMIN")) {
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

const updateSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
});

async function _PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = requireAdmin(request);
  if (auth.error) {
    return auth.error;
  }

  const { id } = await params;

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

  const parsed = updateSchema.safeParse(body);
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

  const { status } = parsed.data;

  const updated = updateRoleRequestStatus(id, status);
  if (!updated) {
    return problem(
      {
        type: "https://lms-219.dev/problems/not-found",
        title: "Not Found",
        status: 404,
        detail: "Role request not found.",
      },
      request
    );
  }

  // Send email notification and write feed event
  try {
    const db = openCliDb(resolveConfig({ envVars: process.env }));
    const userRow = db.prepare("SELECT email FROM users WHERE id = ?").get(updated.user_id) as { email: string } | undefined;
    const roleRow = db.prepare("SELECT name FROM roles WHERE id = ?").get(updated.requested_role_id) as { name: string } | undefined;

    if (userRow && roleRow) {
      const emailPort = resolveTransactionalEmailPort();
      const subject = status === "APPROVED" 
        ? `Your ${roleRow.name} application has been approved!` 
        : `Update on your ${roleRow.name} application`;
      
      const textBody = status === "APPROVED"
        ? `Congratulations! Your application for the ${roleRow.name} role has been approved. You can now access new features in your dashboard.`
        : `Thank you for applying for the ${roleRow.name} role. Unfortunately, we are unable to approve your application at this time.`;

      await emailPort.send({
        to: userRow.email,
        subject,
        textBody,
        htmlBody: `<p>${textBody}</p>`,
        tag: "role-request-update",
      });

      // Write feed event for the applicant
      writeFeedEvent(db, {
        userId: updated.user_id,
        type: "RoleRequestUpdate",
        title:
          status === "APPROVED"
            ? `Your ${roleRow.name} application was approved.`
            : `Your ${roleRow.name} application was not approved.`,
        description:
          status === "APPROVED"
            ? "Welcome to the guild."
            : "Questions? Contact us at studio@studioordo.com",
      });
    }
  } catch (e) {
    console.error("Failed to send role request email notification:", e);
  }

  return new Response(JSON.stringify(updated), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

export const PATCH = withRequestLogging(_PATCH);
