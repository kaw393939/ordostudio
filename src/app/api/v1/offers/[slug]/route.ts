import { getSessionUserFromRequest, isSameOriginMutation } from "../../../../../lib/api/auth";
import { hal, problem } from "../../../../../lib/api/response";
import { parsePayload } from "../../../../../lib/api/validate";
import { updateOfferSchema } from "../../../../../lib/api/schemas";
import {
  deleteOffer,
  getOfferBySlug,
  InvalidOfferInputError,
  OfferNotFoundError,
  updateOffer,
  type OfferAudience,
  type OfferStatus,
} from "../../../../../lib/api/offers";
import { withRequestLogging } from "../../../../../lib/api/request-logging";
import { withRateLimit } from "../../../../../lib/api/rate-limit-wrapper";

type RouteContext = {
  params: Promise<{ slug: string }>;
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

const linksForOffer = (slug: string, status: OfferStatus, includeAdminLinks = false) => ({
  self: { href: `/api/v1/offers/${slug}` },
  collection: { href: "/api/v1/offers" },
  "app:detail": { href: `/services/${slug}` },
  ...(includeAdminLinks
    ? {
        "app:packages": { href: `/api/v1/offers/${slug}/packages` },
        ...(status === "ACTIVE"
          ? { "app:deactivate": { href: `/api/v1/offers/${slug}` } }
          : { "app:activate": { href: `/api/v1/offers/${slug}` } }),
      }
    : {}),
});

async function _GET(request: Request, context: RouteContext) {
  const { slug } = await context.params;
  const sessionUser = getSessionUserFromRequest(request);
  const isAdmin = !!sessionUser && (sessionUser.roles.includes("ADMIN") || sessionUser.roles.includes("SUPER_ADMIN"));

  try {
    const found = getOfferBySlug(slug);

    if (found.status === "INACTIVE" && !isAdmin) {
      return problem(
        {
          type: "https://lms-219.dev/problems/not-found",
          title: "Not Found",
          status: 404,
          detail: "Offer not found.",
        },
        request,
      );
    }

    return hal(
      {
        ...found,
      },
      linksForOffer(found.slug, found.status, isAdmin),
      {
        headers: {
          "cache-control": "private, max-age=30, stale-while-revalidate=60",
        },
      },
    );
  } catch (error) {
    if (error instanceof OfferNotFoundError) {
      return problem(
        {
          type: "https://lms-219.dev/problems/not-found",
          title: "Not Found",
          status: 404,
          detail: "Offer not found.",
        },
        request,
      );
    }

    return problem(
      {
        type: "https://lms-219.dev/problems/internal",
        title: "Internal Server Error",
        status: 500,
        detail: "Unable to load offer.",
      },
      request,
    );
  }
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

  const { slug } = await context.params;
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

  const parsed = parsePayload(updateOfferSchema, raw, request);
  if (!parsed.success) return parsed.response;

  try {
    const updated = updateOffer(slug, {
      title: parsed.data.title,
      summary: parsed.data.summary,
      priceCents: parsed.data.price_cents,
      currency: parsed.data.currency,
      durationLabel: parsed.data.duration_label,
      refundPolicyKey: parsed.data.refund_policy_key,
      audience: parsed.data.audience as OfferAudience | undefined,
      deliveryMode: parsed.data.delivery_mode,
      bookingUrl: parsed.data.booking_url,
      outcomes: parsed.data.outcomes,
      status: parsed.data.status as OfferStatus | undefined,
      confirmPriceChange: parsed.data.confirm_price_change,
      actorId: auth.user.id,
      requestId: crypto.randomUUID(),
    });

    return hal(
      {
        ...updated,
      },
      linksForOffer(updated.slug, updated.status, true),
    );
  } catch (error) {
    if (error instanceof OfferNotFoundError) {
      return problem(
        {
          type: "https://lms-219.dev/problems/not-found",
          title: "Not Found",
          status: 404,
          detail: "Offer not found.",
        },
        request,
      );
    }

    if (error instanceof InvalidOfferInputError) {
      if (error.reason === "price_change_requires_confirm") {
        return problem(
          {
            type: "https://lms-219.dev/problems/precondition",
            title: "Precondition Failed",
            status: 412,
            detail: "Price changes require explicit confirmation.",
          },
          request,
        );
      }

      return problem(
        {
          type: "https://lms-219.dev/problems/invalid-input",
          title: "Bad Request",
          status: 400,
          detail: "Invalid offer payload.",
        },
        request,
      );
    }

    return problem(
      {
        type: "https://lms-219.dev/problems/internal",
        title: "Internal Server Error",
        status: 500,
        detail: "Unable to update offer.",
      },
      request,
    );
  }
}

async function _DELETE(request: Request, context: RouteContext) {
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

  const { slug } = await context.params;

  try {
    deleteOffer(slug, auth.user.id, crypto.randomUUID());
    return new Response(null, { status: 204 });
  } catch (error) {
    if (error instanceof OfferNotFoundError) {
      return problem(
        {
          type: "https://lms-219.dev/problems/not-found",
          title: "Not Found",
          status: 404,
          detail: "Offer not found.",
        },
        request,
      );
    }

    return problem(
      {
        type: "https://lms-219.dev/problems/internal",
        title: "Internal Server Error",
        status: 500,
        detail: "Unable to delete offer.",
      },
      request,
    );
  }
}

export const GET = withRequestLogging(_GET);
export const PATCH = withRequestLogging(withRateLimit("user:write", _PATCH));
export const DELETE = withRequestLogging(withRateLimit("user:write", _DELETE));
