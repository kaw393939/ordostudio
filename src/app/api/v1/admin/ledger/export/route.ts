import { getSessionUserFromRequest } from "@/lib/api/auth";
import { problem } from "@/lib/api/response";
import { exportLedgerCsvAdmin, type LedgerEntryStatus } from "@/lib/api/ledger";
import { withRequestLogging } from "@/lib/api/request-logging";

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
    const csv = exportLedgerCsvAdmin({ status });
    return new Response(csv, {
      status: 200,
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename=ledger-${status ?? "all"}.csv`,
        "cache-control": "no-store",
      },
    });
  } catch {
    return problem(
      {
        type: "https://lms-219.dev/problems/internal",
        title: "Internal Server Error",
        status: 500,
        detail: "Unable to export ledger.",
      },
      request,
    );
  }
}

export const GET = withRequestLogging(_GET);
