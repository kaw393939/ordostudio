import { getSessionUserFromRequest, isSameOriginMutation } from "../../../../../../../lib/api/auth";
import { problem } from "../../../../../../../lib/api/response";
import { parsePayload } from "../../../../../../../lib/api/validate";
import { updatePackageSchema } from "../../../../../../../lib/api/schemas";
import {
  InvalidOfferInputError,
  OfferNotFoundError,
  OfferPackageNotFoundError,
  updateOfferPackage,
  deleteOfferPackage,
} from "../../../../../../../lib/api/offers";
import { hal } from "../../../../../../../lib/api/response";
import { withRequestLogging } from "../../../../../../../lib/api/request-logging";
import { withRateLimit } from "../../../../../../../lib/api/rate-limit-wrapper";

type RouteContext = {
  params: Promise<{ slug: string; packageId: string }>;
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

  const { slug, packageId } = await context.params;

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

  const parsed = parsePayload(updatePackageSchema, raw, request);
  if (!parsed.success) return parsed.response;

  try {
    const updated = updateOfferPackage(slug, packageId, {
      name: parsed.data.name,
      scope: parsed.data.scope,
      priceLabel: parsed.data.price_label,
      sortOrder: parsed.data.sort_order,
      actorId: auth.user.id,
      requestId: crypto.randomUUID(),
    });

    return hal(
      {
        ...updated,
      },
      {
        self: { href: `/api/v1/offers/${slug}/packages/${updated.id}` },
        offer: { href: `/api/v1/offers/${slug}` },
      },
    );
  } catch (error) {
    if (error instanceof OfferNotFoundError || error instanceof OfferPackageNotFoundError) {
      return problem(
        {
          type: "https://lms-219.dev/problems/not-found",
          title: "Not Found",
          status: 404,
          detail: "Offer package not found.",
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
        detail: "Unable to update package.",
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

  const { slug, packageId } = await context.params;

  try {
    deleteOfferPackage(slug, packageId, auth.user.id, crypto.randomUUID());
    return new Response(null, { status: 204 });
  } catch (error) {
    if (error instanceof OfferNotFoundError || error instanceof OfferPackageNotFoundError) {
      return problem(
        {
          type: "https://lms-219.dev/problems/not-found",
          title: "Not Found",
          status: 404,
          detail: "Offer package not found.",
        },
        request,
      );
    }

    return problem(
      {
        type: "https://lms-219.dev/problems/internal",
        title: "Internal Server Error",
        status: 500,
        detail: "Unable to delete package.",
      },
      request,
    );
  }
}

export const PATCH = withRequestLogging(withRateLimit("user:write", _PATCH));
export const DELETE = withRequestLogging(withRateLimit("user:write", _DELETE));
