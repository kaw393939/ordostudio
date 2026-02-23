import { hal, problem } from "../../../../lib/api/response";
import { getCommercialOverview, listInvoices, listProposals } from "../../../../lib/api/commercial";
import { requireAdmin } from "./_auth";
import { withRequestLogging } from "../../../../lib/api/request-logging";

async function _GET(request: Request) {
  const auth = requireAdmin(request);
  if (auth.error) {
    return auth.error;
  }

  try {
    const overview = getCommercialOverview();
    const proposals = listProposals();
    const invoices = listInvoices();

    return hal(
      {
        overview,
        proposals_count: proposals.length,
        invoices_count: invoices.length,
      },
      {
        self: { href: "/api/v1/commercial" },
        proposals: { href: "/api/v1/commercial/proposals" },
        invoices: { href: "/api/v1/commercial/invoices" },
      },
      {
        headers: {
          "cache-control": "no-store",
        },
      },
    );
  } catch {
    return problem(
      {
        type: "https://lms-219.dev/problems/internal",
        title: "Internal Server Error",
        status: 500,
        detail: "Unable to load commercial overview.",
      },
      request,
    );
  }
}

export const GET = withRequestLogging(_GET);
