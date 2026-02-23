import { getSessionUserFromRequest, isSameOriginMutation } from "@/lib/api/auth";
import { hal, problem } from "@/lib/api/response";
import { createStripeCheckoutForDeal, PaymentConflictError, PaymentPreconditionError } from "@/lib/api/payments";
import { withRequestLogging } from "@/lib/api/request-logging";
import { withRateLimit } from "@/lib/api/rate-limit-wrapper";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const requireAdminOrMaestro = (request: Request) => {
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

  if (!user.roles.includes("ADMIN") && !user.roles.includes("SUPER_ADMIN") && !user.roles.includes("MAESTRO")) {
    return {
      error: problem(
        {
          type: "https://lms-219.dev/problems/forbidden",
          title: "Forbidden",
          status: 403,
          detail: "Admin/maestro role required.",
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

  const auth = requireAdminOrMaestro(request);
  if (auth.error) {
    return auth.error;
  }

  const { id } = await context.params;
  const origin = new URL(request.url).origin;

  try {
    const result = await createStripeCheckoutForDeal({
      dealId: id,
      actorId: auth.user.id,
      requestId: crypto.randomUUID(),
      successUrl: `${origin}/admin/deals/${id}`,
      cancelUrl: `${origin}/admin/deals/${id}`,
    });

    return hal(
      {
        payment: result.payment,
        checkout_url: result.checkoutUrl,
      },
      {
        self: { href: `/api/v1/admin/deals/${id}/checkout` },
        deal: { href: `/api/v1/admin/deals/${id}` },
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof PaymentPreconditionError) {
      return problem(
        {
          type: "https://lms-219.dev/problems/precondition",
          title: "Precondition Failed",
          status: 412,
          detail: "Unable to create checkout session for deal.",
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
          detail: "Deal already has a completed payment.",
        },
        request,
      );
    }

    return problem(
      {
        type: "https://lms-219.dev/problems/internal",
        title: "Internal Server Error",
        status: 500,
        detail: "Unable to create checkout session.",
      },
      request,
    );
  }
}

export const POST = withRequestLogging(withRateLimit("admin:write", _POST));
