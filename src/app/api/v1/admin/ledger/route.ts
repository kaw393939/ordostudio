import { getSessionUserFromRequest, isSameOriginMutation } from "@/lib/api/auth";
import { hal, problem } from "@/lib/api/response";
import { parsePayload } from "@/lib/api/validate";
import { ledgerApproveSchema } from "@/lib/api/schemas";
import {
  approveLedgerEntriesAdmin,
  LedgerPreconditionError,
  listLedgerEntriesAdmin,
  type LedgerEntryStatus,
} from "@/lib/api/ledger";
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

const parseStatus = (value: string | null): LedgerEntryStatus | undefined => {
  const normalized = (value ?? "").trim().toUpperCase();
  if (normalized === "EARNED" || normalized === "APPROVED" || normalized === "PAID" || normalized === "VOID") {
    return normalized as LedgerEntryStatus;
  }
  return undefined;
};

async function _GET(request: Request) {
  const auth = requireAdmin(request);
  if (auth.error) {
    return auth.error;
  }

  const { searchParams } = new URL(request.url);
  const status = parseStatus(searchParams.get("status"));

  try {
    const result = listLedgerEntriesAdmin({ status });

    return hal(
      {
        count: result.count,
        limit: result.limit,
        offset: result.offset,
        items: result.items.map((item) => ({
          ...item,
          _links: {
            self: { href: `/api/v1/admin/ledger#${item.id}` },
            deal: { href: `/api/v1/admin/deals/${item.deal_id}` },
          },
        })),
      },
      {
        self: { href: "/api/v1/admin/ledger" },
        export: { href: status ? `/api/v1/admin/ledger/export?status=${status}` : "/api/v1/admin/ledger/export" },
      },
      { headers: { "cache-control": "no-store" } },
    );
  } catch {
    return problem(
      {
        type: "https://lms-219.dev/problems/internal",
        title: "Internal Server Error",
        status: 500,
        detail: "Unable to load ledger entries.",
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

  const parsed = parsePayload(ledgerApproveSchema, raw, request);
  if (!parsed.success) return parsed.response;

  try {
    const result = approveLedgerEntriesAdmin({
      entryIds: Array.isArray(parsed.data.entry_ids) ? parsed.data.entry_ids : [],
      actorId: auth.user.id,
      requestId: crypto.randomUUID(),
      confirm: parsed.data.confirm === true,
    });

    return hal(
      result,
      {
        self: { href: "/api/v1/admin/ledger" },
      },
    );
  } catch (error) {
    if (error instanceof LedgerPreconditionError) {
      return problem(
        {
          type: "https://lms-219.dev/problems/precondition",
          title: "Precondition Failed",
          status: 412,
          detail: "Approval requires confirmation.",
        },
        request,
      );
    }

    return problem(
      {
        type: "https://lms-219.dev/problems/internal",
        title: "Internal Server Error",
        status: 500,
        detail: "Unable to approve ledger entries.",
      },
      request,
    );
  }
}

export const GET = withRequestLogging(_GET);
export const POST = withRequestLogging(withRateLimit("admin:write", _POST));
