import { getSessionUserFromRequest, isSameOriginMutation } from "../../../../../../lib/api/auth";
import { hal, problem } from "../../../../../../lib/api/response";
import { parsePayload } from "../../../../../../lib/api/validate";
import { accountDealUpdateSchema } from "../../../../../../lib/api/schemas";
import { DealNotFoundError, getDealById, updateDealStatus, type DealStatus } from "../../../../../../lib/api/deals";
import { asUserActor } from "../../../../../../lib/api/actor";
import { withRequestLogging } from "../../../../../../lib/api/request-logging";
import { withRateLimit } from "../../../../../../lib/api/rate-limit-wrapper";

const parseStatus = (value: unknown): DealStatus | null => {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toUpperCase();
  if (
    normalized === "IN_PROGRESS" ||
    normalized === "DELIVERED" ||
    normalized === "CLOSED" ||
    normalized === "REFUNDED" ||
    normalized === "PAID" ||
    normalized === "ASSIGNED" ||
    normalized === "MAESTRO_APPROVED" ||
    normalized === "QUEUED"
  ) {
    return normalized as DealStatus;
  }
  return null;
};

async function _GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = getSessionUserFromRequest(request);
  if (!user) {
    return problem(
      {
        type: "https://lms-219.dev/problems/unauthorized",
        title: "Unauthorized",
        status: 401,
        detail: "Active session required.",
      },
      request,
    );
  }

  const { id } = await context.params;

  try {
    const deal = getDealById(id);
    const allowed =
      user.roles.includes("ADMIN") ||
      user.roles.includes("SUPER_ADMIN") ||
      deal.provider_user_id === user.id ||
      deal.maestro_user_id === user.id;

    if (!allowed) {
      return problem(
        {
          type: "https://lms-219.dev/problems/forbidden",
          title: "Forbidden",
          status: 403,
          detail: "Not authorized to access this deal.",
        },
        request,
      );
    }

    return hal(
      deal,
      {
        self: { href: `/api/v1/account/deals/${id}` },
      },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof DealNotFoundError) {
      return problem(
        {
          type: "https://lms-219.dev/problems/not-found",
          title: "Not Found",
          status: 404,
          detail: "Deal not found.",
        },
        request,
      );
    }

    return problem(
      {
        type: "https://lms-219.dev/problems/internal",
        title: "Internal Server Error",
        status: 500,
        detail: "Unable to load deal.",
      },
      request,
    );
  }
}

async function _PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
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

  const user = getSessionUserFromRequest(request);
  if (!user) {
    return problem(
      {
        type: "https://lms-219.dev/problems/unauthorized",
        title: "Unauthorized",
        status: 401,
        detail: "Active session required.",
      },
      request,
    );
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

  const parsed = parsePayload(accountDealUpdateSchema, raw, request);
  if (!parsed.success) return parsed.response;

  const status = parseStatus(parsed.data.status);
  if (!status) {
    return problem(
      {
        type: "https://lms-219.dev/problems/invalid-input",
        title: "Bad Request",
        status: 400,
        detail: "Invalid status.",
      },
      request,
    );
  }

  try {
    const deal = getDealById(id);
    const allowed =
      user.roles.includes("ADMIN") ||
      user.roles.includes("SUPER_ADMIN") ||
      deal.provider_user_id === user.id ||
      deal.maestro_user_id === user.id;

    if (!allowed) {
      return problem(
        {
          type: "https://lms-219.dev/problems/forbidden",
          title: "Forbidden",
          status: 403,
          detail: "Not authorized to update this deal.",
        },
        request,
      );
    }

    const updated = updateDealStatus({
      dealId: id,
      toStatus: status,
      note: parsed.data.note,
      actor: asUserActor(user.id),
      requestId: crypto.randomUUID(),
    });

    return hal(updated, { self: { href: `/api/v1/account/deals/${id}` } });
  } catch (error) {
    if (error instanceof DealNotFoundError) {
      return problem(
        {
          type: "https://lms-219.dev/problems/not-found",
          title: "Not Found",
          status: 404,
          detail: "Deal not found.",
        },
        request,
      );
    }

    return problem(
      {
        type: "https://lms-219.dev/problems/precondition-failed",
        title: "Precondition Failed",
        status: 412,
        detail: "Deal guardrail violated.",
      },
      request,
    );
  }
}

export const GET = withRequestLogging(_GET);
export const PATCH = withRequestLogging(withRateLimit("user:write", _PATCH));
