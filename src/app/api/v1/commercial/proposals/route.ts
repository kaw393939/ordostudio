import { isSameOriginMutation } from "../../../../../lib/api/auth";
import { hal, problem } from "../../../../../lib/api/response";
import { parsePayload } from "../../../../../lib/api/validate";
import { createProposalSchema } from "../../../../../lib/api/schemas";
import { createProposal, listProposals } from "../../../../../lib/api/commercial";
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
    const items = listProposals({
      status: searchParams.get("status") ?? undefined,
      clientEmail: searchParams.get("client_email") ?? undefined,
      offerSlug: searchParams.get("offer_slug") ?? undefined,
    }).map((item) => ({
      ...item,
      _links: {
        self: { href: `/api/v1/commercial/proposals/${item.id}` },
      },
    }));

    return hal(
      {
        count: items.length,
        items,
      },
      {
        self: { href: "/api/v1/commercial/proposals" },
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
          detail: "Invalid proposal query filters.",
        },
        request,
      );
    }

    return problem(
      {
        type: "https://lms-219.dev/problems/internal",
        title: "Internal Server Error",
        status: 500,
        detail: "Unable to list proposals.",
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

  const parsed = parsePayload(createProposalSchema, raw, request);
  if (!parsed.success) return parsed.response;

  try {
    const created = createProposal(
      {
        intake_request_id: parsed.data.intake_request_id,
        event_slug: parsed.data.event_slug,
        offer_slug: parsed.data.offer_slug,
        client_email: parsed.data.client_email,
        title: parsed.data.title,
        amount_cents: parsed.data.amount_cents,
        currency: parsed.data.currency,
        expires_at: parsed.data.expires_at,
      },
      auth.user.id,
      crypto.randomUUID(),
    );

    return hal(
      created,
      {
        self: { href: `/api/v1/commercial/proposals/${created.id}` },
        collection: { href: "/api/v1/commercial/proposals" },
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
          detail: "Invalid proposal payload.",
        },
        request,
      );
    }

    return problem(
      {
        type: "https://lms-219.dev/problems/internal",
        title: "Internal Server Error",
        status: 500,
        detail: "Unable to create proposal.",
      },
      request,
    );
  }
}

export const GET = withRequestLogging(_GET);
export const POST = withRequestLogging(withRateLimit("user:write", _POST));
