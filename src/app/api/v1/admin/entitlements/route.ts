import { getSessionUserFromRequest, isSameOriginMutation } from "../../../../../lib/api/auth";
import { hal, problem } from "../../../../../lib/api/response";
import { parsePayload } from "../../../../../lib/api/validate";
import { entitlementActionSchema } from "../../../../../lib/api/schemas";
import {
  EntitlementInputError,
  EntitlementNotFoundError,
  grantEntitlementAdmin,
  listEntitlementsAdmin,
  revokeEntitlementAdmin,
} from "../../../../../lib/api/entitlements";
import { withRequestLogging } from "../../../../../lib/api/request-logging";
import { withRateLimit } from "../../../../../lib/api/rate-limit-wrapper";

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

async function _GET(request: Request) {
  const auth = requireAdmin(request);
  if (auth.error) {
    return auth.error;
  }

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("user_id") ?? undefined;
  const key = searchParams.get("key") ?? undefined;
  const status = (searchParams.get("status") ?? undefined) as "GRANTED" | "REVOKED" | undefined;

  try {
    const result = listEntitlementsAdmin({
      userId: userId?.trim().length ? userId.trim() : undefined,
      key: key?.trim().length ? key.trim() : undefined,
      status: status === "GRANTED" || status === "REVOKED" ? status : undefined,
    });

    return hal(
      {
        count: result.count,
        items: result.items,
      },
      {
        self: { href: "/api/v1/admin/entitlements" },
      },
      { headers: { "cache-control": "no-store" } },
    );
  } catch {
    return problem(
      {
        type: "https://lms-219.dev/problems/internal",
        title: "Internal Server Error",
        status: 500,
        detail: "Unable to load entitlements.",
      },
      request,
    );
  }
}

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

  const parsed = parsePayload(entitlementActionSchema, raw, request);
  if (!parsed.success) return parsed.response;

  if (!parsed.data.user_id || !parsed.data.entitlement_key) {
    return problem(
      {
        type: "https://lms-219.dev/problems/invalid-input",
        title: "Bad Request",
        status: 400,
        detail: "user_id and entitlement_key are required.",
      },
      request,
    );
  }

  try {
    if (parsed.data.action === "grant") {
      const updated = grantEntitlementAdmin({
        userId: parsed.data.user_id,
        entitlementKey: parsed.data.entitlement_key,
        actorId: auth.user.id,
        requestId: crypto.randomUUID(),
        reason: parsed.data.reason ?? null,
      });

      return hal(updated, { self: { href: "/api/v1/admin/entitlements" } }, { status: 200 });
    }

    if (parsed.data.action === "revoke") {
      const updated = revokeEntitlementAdmin({
        userId: parsed.data.user_id,
        entitlementKey: parsed.data.entitlement_key,
        actorId: auth.user.id,
        requestId: crypto.randomUUID(),
        reason: parsed.data.reason ?? null,
      });

      return hal(updated, { self: { href: "/api/v1/admin/entitlements" } }, { status: 200 });
    }

    return problem(
      {
        type: "https://lms-219.dev/problems/invalid-input",
        title: "Bad Request",
        status: 400,
        detail: "Invalid action.",
      },
      request,
    );
  } catch (error) {
    if (error instanceof EntitlementInputError) {
      return problem(
        {
          type: "https://lms-219.dev/problems/invalid-input",
          title: "Bad Request",
          status: 400,
          detail: "Invalid entitlement payload.",
        },
        request,
      );
    }

    if (error instanceof EntitlementNotFoundError) {
      return problem(
        {
          type: "https://lms-219.dev/problems/not-found",
          title: "Not Found",
          status: 404,
          detail: "Entitlement not found.",
        },
        request,
      );
    }

    return problem(
      {
        type: "https://lms-219.dev/problems/internal",
        title: "Internal Server Error",
        status: 500,
        detail: "Unable to update entitlements.",
      },
      request,
    );
  }
}

export const GET = withRequestLogging(_GET);
export const POST = withRequestLogging(withRateLimit("admin:write", _POST));
