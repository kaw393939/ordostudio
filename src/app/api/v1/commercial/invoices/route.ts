import { isSameOriginMutation } from "../../../../../lib/api/auth";
import { hal, problem } from "../../../../../lib/api/response";
import { parsePayload } from "../../../../../lib/api/validate";
import { createInvoiceSchema } from "../../../../../lib/api/schemas";
import { createInvoice, listInvoices } from "../../../../../lib/api/commercial";
import { InvalidInputError } from "../../../../../core/domain/errors";
import { requireAdmin } from "../_auth";
import { withRequestLogging } from "../../../../../lib/api/request-logging";
import { withRateLimit } from "../../../../../lib/api/rate-limit-wrapper";

async function _GET(request: Request) {
  const auth = requireAdmin(request);
  if (auth.error) {
    return auth.error;
  }

  const { searchParams } = new URL(request.url);

  try {
    const items = listInvoices({
      status: searchParams.get("status") ?? undefined,
      clientEmail: searchParams.get("client_email") ?? undefined,
    }).map((item) => ({
      ...item,
      _links: {
        self: { href: `/api/v1/commercial/invoices/${item.id}` },
        payments: { href: `/api/v1/commercial/invoices/${item.id}/payments` },
      },
    }));

    return hal(
      {
        count: items.length,
        items,
      },
      {
        self: { href: "/api/v1/commercial/invoices" },
        commercial: { href: "/api/v1/commercial" },
      },
      {
        headers: {
          "cache-control": "no-store",
        },
      },
    );
  } catch (error) {
    if (error instanceof InvalidInputError) {
      return problem(
        {
          type: "https://lms-219.dev/problems/invalid-input",
          title: "Bad Request",
          status: 400,
          detail: "Invalid invoice query filters.",
        },
        request,
      );
    }

    return problem(
      {
        type: "https://lms-219.dev/problems/internal",
        title: "Internal Server Error",
        status: 500,
        detail: "Unable to list invoices.",
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

  const parsed = parsePayload(createInvoiceSchema, raw, request);
  if (!parsed.success) return parsed.response;

  try {
    const created = createInvoice(
      {
        proposal_id: parsed.data.proposal_id,
        event_slug: parsed.data.event_slug,
        intake_request_id: parsed.data.intake_request_id,
        client_email: parsed.data.client_email,
        amount_cents: parsed.data.amount_cents,
        currency: parsed.data.currency,
        due_at: parsed.data.due_at,
      },
      auth.user.id,
      crypto.randomUUID(),
    );

    return hal(
      created,
      {
        self: { href: `/api/v1/commercial/invoices/${created.id}` },
        collection: { href: "/api/v1/commercial/invoices" },
        payments: { href: `/api/v1/commercial/invoices/${created.id}/payments` },
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof InvalidInputError) {
      return problem(
        {
          type: "https://lms-219.dev/problems/invalid-input",
          title: "Bad Request",
          status: 400,
          detail: "Invalid invoice payload.",
        },
        request,
      );
    }

    return problem(
      {
        type: "https://lms-219.dev/problems/internal",
        title: "Internal Server Error",
        status: 500,
        detail: "Unable to create invoice.",
      },
      request,
    );
  }
}

export const GET = withRequestLogging(_GET);
export const POST = withRequestLogging(withRateLimit("user:write", _POST));
