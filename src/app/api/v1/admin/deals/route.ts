import { getSessionUserFromRequest, isSameOriginMutation } from "../../../../../lib/api/auth";
import { hal, problem } from "../../../../../lib/api/response";
import { parsePayload } from "../../../../../lib/api/validate";
import { createDealSchema } from "../../../../../lib/api/schemas";
import {
  createDealFromIntake,
  listDealsAdmin,
  type DealStatus,
  DealConflictError,
  DealIntakeNotFoundError,
  DealPreconditionError,
} from "../../../../../lib/api/deals";
import { withRequestLogging } from "../../../../../lib/api/request-logging";
import { withRateLimit } from "../../../../../lib/api/rate-limit-wrapper";

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

const parseStatus = (value: string | null): DealStatus | undefined => {
  const normalized = (value ?? "").trim().toUpperCase();
  if (
    normalized === "QUEUED" ||
    normalized === "ASSIGNED" ||
    normalized === "MAESTRO_APPROVED" ||
    normalized === "PAID" ||
    normalized === "IN_PROGRESS" ||
    normalized === "DELIVERED" ||
    normalized === "CLOSED" ||
    normalized === "REFUNDED"
  ) {
    return normalized as DealStatus;
  }
  return undefined;
};

async function _GET(request: Request) {
  const auth = requireAdminOrMaestro(request);
  if ("error" in auth) {
    return auth.error;
  }

  const { searchParams } = new URL(request.url);
  const status = parseStatus(searchParams.get("status"));
  const intakeId = searchParams.get("intake_id") ?? undefined;
  const limit = searchParams.get("limit");
  const offset = searchParams.get("offset");

  try {
    const result = listDealsAdmin({
      status,
      intakeId,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });

    return hal(
      {
        count: result.count,
        limit: result.limit,
        offset: result.offset,
        items: result.items.map((item) => ({
          ...item,
          _links: {
            self: { href: `/api/v1/admin/deals/${item.id}` },
          },
        })),
      },
      {
        self: { href: "/api/v1/admin/deals" },
      },
      {
        headers: { "cache-control": "no-store" },
      },
    );
  } catch {
    return problem(
      {
        type: "https://lms-219.dev/problems/internal",
        title: "Internal Server Error",
        status: 500,
        detail: "Unable to load deals.",
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

  const auth = requireAdminOrMaestro(request);
  if ("error" in auth) {
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

  const parsed = parsePayload(createDealSchema, raw, request);
  if (!parsed.success) return parsed.response;

  if (!parsed.data.intake_id || parsed.data.intake_id.trim().length === 0) {
    return problem(
      {
        type: "https://lms-219.dev/problems/invalid-input",
        title: "Bad Request",
        status: 400,
        detail: "intake_id is required.",
      },
      request,
    );
  }

  try {
    const created = createDealFromIntake({
      intakeId: parsed.data.intake_id.trim(),
      requestedProviderUserId: parsed.data.requested_provider_user_id ?? null,
      actorId: auth.user.id,
      requestId: crypto.randomUUID(),
    });

    return hal(
      created,
      {
        self: { href: `/api/v1/admin/deals/${created.id}` },
        collection: { href: "/api/v1/admin/deals" },
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof DealIntakeNotFoundError) {
      return problem(
        {
          type: "https://lms-219.dev/problems/not-found",
          title: "Not Found",
          status: 404,
          detail: "Intake request not found.",
        },
        request,
      );
    }

    if (error instanceof DealConflictError) {
      return problem(
        {
          type: "https://lms-219.dev/problems/conflict",
          title: "Conflict",
          status: 409,
          detail: "A deal already exists for that intake.",
        },
        request,
      );
    }

    if (error instanceof DealPreconditionError) {
      const detail =
        error.reason === "offer_slug_required"
          ? "Intake request must specify an offer_slug."
          : error.reason === "offer_not_found"
            ? "Offer not found for intake offer_slug."
            : error.reason === "offer_inactive"
              ? "Offer is inactive; cannot create deal."
              : "Deal precondition failed.";

      return problem(
        {
          type: "https://lms-219.dev/problems/precondition",
          title: "Precondition Failed",
          status: 412,
          detail,
        },
        request,
      );
    }

    return problem(
      {
        type: "https://lms-219.dev/problems/invalid-input",
        title: "Bad Request",
        status: 400,
        detail: "Unable to create deal.",
      },
      request,
    );
  }
}

export const GET = withRequestLogging(_GET);
export const POST = withRequestLogging(withRateLimit("admin:write", _POST));
