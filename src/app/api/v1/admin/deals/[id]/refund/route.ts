import { getSessionUserFromRequest, isSameOriginMutation } from "@/lib/api/auth";
import { hal, problem } from "@/lib/api/response";
import { parsePayload } from "@/lib/api/validate";
import { refundDealSchema } from "@/lib/api/schemas";
import { refundDealPaymentAdmin, PaymentConflictError, PaymentNotFoundError, PaymentPreconditionError } from "@/lib/api/payments";
import { withRequestLogging } from "@/lib/api/request-logging";
import { withRateLimit } from "@/lib/api/rate-limit-wrapper";

type RouteContext = {
  params: Promise<{ id: string }>;
};

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

  const parsed = parsePayload(refundDealSchema, raw, request);
  if (!parsed.success) return parsed.response;

  const reason = (parsed.data.reason ?? "").trim();
  if (reason.length === 0) {
    return problem(
      {
        type: "https://lms-219.dev/problems/invalid-input",
        title: "Bad Request",
        status: 400,
        detail: "reason is required.",
      },
      request,
    );
  }

  try {
    const result = await refundDealPaymentAdmin({
      dealId: id,
      actorId: auth.user.id,
      requestId: crypto.randomUUID(),
      reason,
      confirm: parsed.data.confirm === true,
    });

    return hal(
      {
        payment: result.payment,
      },
      {
        self: { href: `/api/v1/admin/deals/${id}/refund` },
        deal: { href: `/api/v1/admin/deals/${id}` },
      },
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof PaymentNotFoundError) {
      return problem(
        {
          type: "https://lms-219.dev/problems/not-found",
          title: "Not Found",
          status: 404,
          detail: "No payment found for deal.",
        },
        request,
      );
    }

    if (error instanceof PaymentConflictError) {
      return problem(
        {
          type: "https://lms-219.dev/problems/conflict",
          title: "Conflict",
          status: 409,
          detail: "Payment is already refunded.",
        },
        request,
      );
    }

    if (error instanceof PaymentPreconditionError) {
      return problem(
        {
          type: "https://lms-219.dev/problems/precondition",
          title: "Precondition Failed",
          status: 412,
          detail:
            error.reason === "confirm_required"
              ? "Refund requires explicit confirmation."
              : "Refund precondition failed.",
        },
        request,
      );
    }

    return problem(
      {
        type: "https://lms-219.dev/problems/internal",
        title: "Internal Server Error",
        status: 500,
        detail: "Unable to issue refund.",
      },
      request,
    );
  }
}

export const POST = withRequestLogging(withRateLimit("admin:write", _POST));
