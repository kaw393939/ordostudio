import { isSameOriginMutation, getSessionUserFromRequest } from "@/lib/api/auth";
import { hal, problem } from "@/lib/api/response";
import { parsePayload } from "@/lib/api/validate";
import { ledgerPayoutsSchema } from "@/lib/api/schemas";
import { executeApprovedLedgerPayoutsAdmin, PayoutPreconditionError } from "@/lib/api/ledger-payouts";
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

  const parsed = parsePayload(ledgerPayoutsSchema, raw, request);
  if (!parsed.success) return parsed.response;

  try {
    const result = await executeApprovedLedgerPayoutsAdmin({
      entryIds: Array.isArray(parsed.data.entry_ids) ? parsed.data.entry_ids : [],
      actorId: auth.user.id,
      requestId: crypto.randomUUID(),
      confirm: parsed.data.confirm === true,
    });

    return hal(
      result,
      {
        self: { href: "/api/v1/admin/ledger/payouts" },
        ledger: { href: "/api/v1/admin/ledger" },
      },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof PayoutPreconditionError) {
      return problem(
        {
          type: "https://lms-219.dev/problems/precondition",
          title: "Precondition Failed",
          status: 412,
          detail: "Payout execution requires confirmation.",
        },
        request,
      );
    }

    return problem(
      {
        type: "https://lms-219.dev/problems/internal",
        title: "Internal Server Error",
        status: 500,
        detail: "Unable to execute payouts.",
      },
      request,
    );
  }
}

export const POST = withRequestLogging(withRateLimit("admin:write", _POST));
