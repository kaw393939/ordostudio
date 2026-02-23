import { getSessionUserFromRequest, isSameOriginMutation } from "@/lib/api/auth";
import { hal, problem } from "@/lib/api/response";
import { parsePayload } from "@/lib/api/validate";
import { discordLinkSchema } from "@/lib/api/schemas";
import { EntitlementInputError, upsertUserDiscordAccountAdmin } from "@/lib/api/entitlements";
import { withRequestLogging } from "@/lib/api/request-logging";
import { withRateLimit } from "@/lib/api/rate-limit-wrapper";

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

  const parsed = parsePayload(discordLinkSchema, raw, request);
  if (!parsed.success) return parsed.response;

  if (!parsed.data.user_id || !parsed.data.discord_user_id) {
    return problem(
      {
        type: "https://lms-219.dev/problems/invalid-input",
        title: "Bad Request",
        status: 400,
        detail: "user_id and discord_user_id are required.",
      },
      request,
    );
  }

  try {
    const updated = upsertUserDiscordAccountAdmin({
      userId: parsed.data.user_id,
      discordUserId: parsed.data.discord_user_id,
      actorId: auth.user.id,
      requestId: crypto.randomUUID(),
    });

    return hal(updated, { self: { href: "/api/v1/admin/entitlements/discord-link" } }, { status: 200 });
  } catch (error) {
    if (error instanceof EntitlementInputError) {
      return problem(
        {
          type: "https://lms-219.dev/problems/invalid-input",
          title: "Bad Request",
          status: 400,
          detail: "Invalid discord link payload.",
        },
        request,
      );
    }

    return problem(
      {
        type: "https://lms-219.dev/problems/internal",
        title: "Internal Server Error",
        status: 500,
        detail: "Unable to link Discord account.",
      },
      request,
    );
  }
}

export const POST = withRequestLogging(withRateLimit("admin:write", _POST));
