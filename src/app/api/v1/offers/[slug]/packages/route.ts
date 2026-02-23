import { getSessionUserFromRequest, isSameOriginMutation } from "../../../../../../lib/api/auth";
import { hal, problem } from "../../../../../../lib/api/response";
import { parsePayload } from "../../../../../../lib/api/validate";
import { createPackageSchema } from "../../../../../../lib/api/schemas";
import {
  createOfferPackage,
  getOfferBySlug,
  InvalidOfferInputError,
  OfferNotFoundError,
} from "../../../../../../lib/api/offers";
import { withRequestLogging } from "../../../../../../lib/api/request-logging";
import { withRateLimit } from "../../../../../../lib/api/rate-limit-wrapper";

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

async function _GET(request: Request, context: RouteContext) {
  const { slug } = await context.params;

  try {
    const found = getOfferBySlug(slug);
    return hal(
      {
        count: found.packages.length,
        items: found.packages,
      },
      {
        self: { href: `/api/v1/offers/${found.slug}/packages` },
        offer: { href: `/api/v1/offers/${found.slug}` },
      },
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
        detail: "Unable to list offer packages.",
      },
      request,
    );
  }
}

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

  const parsed = parsePayload(createPackageSchema, raw, request);
  if (!parsed.success) return parsed.response;

  try {
    const created = createOfferPackage(slug, {
      name: parsed.data.name,
      scope: parsed.data.scope,
      priceLabel: parsed.data.price_label,
      sortOrder: parsed.data.sort_order,
      actorId: auth.user.id,
      requestId: crypto.randomUUID(),
    });

    return hal(
      {
        ...created,
      },
      {
        self: { href: `/api/v1/offers/${slug}/packages/${created.id}` },
        offer: { href: `/api/v1/offers/${slug}` },
      },
      { status: 201 },
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
      return problem(
        {
          type: "https://lms-219.dev/problems/invalid-input",
          title: "Bad Request",
          status: 400,
          detail: "Invalid package payload.",
        },
        request,
      );
    }

    return problem(
      {
        type: "https://lms-219.dev/problems/internal",
        title: "Internal Server Error",
        status: 500,
        detail: "Unable to create package.",
      },
      request,
    );
  }
}

export const GET = withRequestLogging(_GET);
export const POST = withRequestLogging(withRateLimit("user:write", _POST));
