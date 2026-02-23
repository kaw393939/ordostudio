import { isSameOriginMutation } from "../../../../../../../lib/api/auth";
import { hal, problem } from "../../../../../../../lib/api/response";
import { parsePayload } from "../../../../../../../lib/api/validate";
import { createPaymentSchema } from "../../../../../../../lib/api/schemas";
import { recordPayment } from "../../../../../../../lib/api/commercial";
import { InvalidInputError } from "../../../../../../../core/domain/errors";
import { requireAdmin } from "../../../_auth";
import { withRequestLogging } from "../../../../../../../lib/api/request-logging";
import { withRateLimit } from "../../../../../../../lib/api/rate-limit-wrapper";

type RouteContext = {
  params: Promise<{ id: string }>;
};

async function _POST(request: Request, context: RouteContext) {
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

  const { id } = await context.params;
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

  const parsed = parsePayload(createPaymentSchema, raw, request);
  if (!parsed.success) return parsed.response;

  try {
    const result = recordPayment(
      id,
      {
        amount_cents: parsed.data.amount_cents,
        currency: parsed.data.currency,
        paid_at: parsed.data.paid_at,
        reference: parsed.data.reference,
      },
      auth.user.id,
      crypto.randomUUID(),
    );

    return hal(
      {
        payment: result.payment,
        invoice: result.invoice,
      },
      {
        self: { href: `/api/v1/commercial/invoices/${id}/payments` },
        invoice: { href: `/api/v1/commercial/invoices/${id}` },
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof InvalidInputError) {
      const isNotFound = error.message.includes("invoice_not_found");
      return problem(
        {
          type: isNotFound
            ? "https://lms-219.dev/problems/not-found"
            : "https://lms-219.dev/problems/invalid-input",
          title: isNotFound ? "Not Found" : "Bad Request",
          status: isNotFound ? 404 : 400,
          detail: isNotFound ? "Invoice not found." : "Invalid payment payload.",
        },
        request,
      );
    }

    return problem(
      {
        type: "https://lms-219.dev/problems/internal",
        title: "Internal Server Error",
        status: 500,
        detail: "Unable to record payment.",
      },
      request,
    );
  }
}

export const POST = withRequestLogging(withRateLimit("user:write", _POST));
