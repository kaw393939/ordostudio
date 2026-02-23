import { isSameOriginMutation } from "../../../../../../lib/api/auth";
import { hal, problem } from "../../../../../../lib/api/response";
import { parsePayload } from "../../../../../../lib/api/validate";
import { updateInvoiceSchema } from "../../../../../../lib/api/schemas";
import { listInvoices, updateInvoiceStatus } from "../../../../../../lib/api/commercial";
import { InvalidInputError } from "../../../../../../core/domain/errors";
import { requireAdmin } from "../../_auth";
import { withRequestLogging } from "../../../../../../lib/api/request-logging";
import { withRateLimit } from "../../../../../../lib/api/rate-limit-wrapper";

type RouteContext = {
  params: Promise<{ id: string }>;
};

async function _GET(request: Request, context: RouteContext) {
  const auth = requireAdmin(request);
  if (auth.error) {
    return auth.error;
  }

  const { id } = await context.params;
  const found = listInvoices().find((item) => item.id === id);
  if (!found) {
    return problem(
      {
        type: "https://lms-219.dev/problems/not-found",
        title: "Not Found",
        status: 404,
        detail: "Invoice not found.",
      },
      request,
    );
  }

  return hal(found, {
    self: { href: `/api/v1/commercial/invoices/${id}` },
    collection: { href: "/api/v1/commercial/invoices" },
    payments: { href: `/api/v1/commercial/invoices/${id}/payments` },
  });
}

async function _PATCH(request: Request, context: RouteContext) {
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

  const parsed = parsePayload(updateInvoiceSchema, raw, request);
  if (!parsed.success) return parsed.response;

  try {
    const updated = updateInvoiceStatus(id, parsed.data.status, auth.user.id, crypto.randomUUID(), parsed.data.note);
    return hal(updated, {
      self: { href: `/api/v1/commercial/invoices/${id}` },
      collection: { href: "/api/v1/commercial/invoices" },
      payments: { href: `/api/v1/commercial/invoices/${id}/payments` },
    });
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
          detail: isNotFound ? "Invoice not found." : "Invalid invoice transition payload.",
        },
        request,
      );
    }

    return problem(
      {
        type: "https://lms-219.dev/problems/internal",
        title: "Internal Server Error",
        status: 500,
        detail: "Unable to update invoice.",
      },
      request,
    );
  }
}

export const GET = withRequestLogging(_GET);
export const PATCH = withRequestLogging(withRateLimit("user:write", _PATCH));
