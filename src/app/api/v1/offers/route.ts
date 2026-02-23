import { getSessionUserFromRequest, isSameOriginMutation } from "../../../../lib/api/auth";
import { hal, problem } from "../../../../lib/api/response";
import { parsePayload } from "../../../../lib/api/validate";
import { createOfferSchema } from "../../../../lib/api/schemas";
import {
  createOffer,
  InvalidOfferInputError,
  listOffers,
  OfferConflictError,
  type OfferAudience,
  type OfferDeliveryMode,
  type OfferStatus,
} from "../../../../lib/api/offers";
import { withRequestLogging } from "../../../../lib/api/request-logging";
import { withRateLimit } from "../../../../lib/api/rate-limit-wrapper";

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

async function _GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? undefined;
  const audience = searchParams.get("audience") ?? undefined;
  const deliveryMode = searchParams.get("delivery_mode") ?? undefined;
  const status = searchParams.get("status") ?? undefined;
  const limit = searchParams.get("limit");
  const offset = searchParams.get("offset");

  try {
    const result = listOffers({
      q,
      audience: audience?.toUpperCase(),
      deliveryMode: deliveryMode?.toUpperCase(),
      status: status?.toUpperCase(),
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });

    const isAdmin = (() => {
      const user = getSessionUserFromRequest(request);
      return !!user && (user.roles.includes("ADMIN") || user.roles.includes("SUPER_ADMIN"));
    })();

    return hal(
      {
        count: result.count,
        limit: result.limit,
        offset: result.offset,
        items: result.items.map((item) => ({
          ...item,
          _links: linksForOffer(item.slug, item.status, isAdmin),
        })),
      },
      {
        self: { href: "/api/v1/offers" },
      },
      {
        headers: {
          "cache-control": "private, max-age=30, stale-while-revalidate=60",
        },
      },
    );
  } catch (error) {
    if (error instanceof InvalidOfferInputError) {
      return problem(
        {
          type: "https://lms-219.dev/problems/invalid-input",
          title: "Bad Request",
          status: 400,
          detail: "Invalid offer filter input.",
        },
        request,
      );
    }

    return problem(
      {
        type: "https://lms-219.dev/problems/internal",
        title: "Internal Server Error",
        status: 500,
        detail: "Unable to list offers.",
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

  const parsed = parsePayload(createOfferSchema, raw, request);
  if (!parsed.success) return parsed.response;

  try {
    const created = createOffer({
      slug: parsed.data.slug,
      title: parsed.data.title,
      summary: parsed.data.summary,
      priceCents: parsed.data.price_cents,
      currency: parsed.data.currency,
      durationLabel: parsed.data.duration_label,
      refundPolicyKey: parsed.data.refund_policy_key,
      audience: parsed.data.audience as OfferAudience,
      deliveryMode: parsed.data.delivery_mode as OfferDeliveryMode,
      bookingUrl: parsed.data.booking_url,
      outcomes: parsed.data.outcomes,
      status: parsed.data.status as OfferStatus,
      actorId: auth.user.id,
      requestId: crypto.randomUUID(),
    });

    return hal(
      {
        ...created,
      },
      linksForOffer(created.slug, created.status, true),
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof OfferConflictError) {
      return problem(
        {
          type: "https://lms-219.dev/problems/conflict",
          title: "Conflict",
          status: 409,
          detail: "Offer already exists for slug.",
        },
        request,
      );
    }

    if (error instanceof InvalidOfferInputError) {
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
        detail: "Unable to create offer.",
      },
      request,
    );
  }
}

export const GET = withRequestLogging(_GET);
export const POST = withRequestLogging(withRateLimit("user:write", _POST));
