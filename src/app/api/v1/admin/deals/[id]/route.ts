import { getSessionUserFromRequest, isSameOriginMutation } from "../../../../../../lib/api/auth";
import { hal, problem } from "../../../../../../lib/api/response";
import { parsePayload } from "../../../../../../lib/api/validate";
import { updateDealSchema } from "../../../../../../lib/api/schemas";
import {
  approveDealAdmin,
  assignDealAdmin,
  DealNotFoundError,
  DealPreconditionError,
  getDealById,
  updateDealStatus,
  type DealStatus,
} from "../../../../../../lib/api/deals";
import { asUserActor } from "../../../../../../lib/api/actor";
import { withRequestLogging } from "../../../../../../lib/api/request-logging";
import { withRateLimit } from "../../../../../../lib/api/rate-limit-wrapper";

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

const parseStatus = (value: unknown): DealStatus | null => {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toUpperCase();
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
  return null;
};

async function _GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = requireAdminOrMaestro(request);
  if ("error" in auth) {
    return auth.error;
  }

  const { id } = await context.params;

  try {
    const deal = getDealById(id);
    return hal(
      deal,
      {
        self: { href: `/api/v1/admin/deals/${id}` },
        collection: { href: "/api/v1/admin/deals" },
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

  const auth = requireAdminOrMaestro(request);
  if ("error" in auth) {
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

  const parsed = parsePayload(updateDealSchema, raw, request);
  if (!parsed.success) return parsed.response;

  try {
    if (parsed.data.action === "assign") {
      const updated = assignDealAdmin({
        dealId: id,
        providerUserId: parsed.data.provider_user_id,
        maestroUserId: parsed.data.maestro_user_id,
        note: parsed.data.note,
        actor: asUserActor(auth.user.id),
        requestId: crypto.randomUUID(),
      });

      return hal(updated, { self: { href: `/api/v1/admin/deals/${id}` } });
    }

    if (parsed.data.action === "approve") {
      const updated = approveDealAdmin({
        dealId: id,
        note: parsed.data.note,
        actor: asUserActor(auth.user.id),
        requestId: crypto.randomUUID(),
      });

      return hal(updated, { self: { href: `/api/v1/admin/deals/${id}` } });
    }

    if (parsed.data.action === "status") {
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

      if (status === "PAID" || status === "REFUNDED") {
        return problem(
          {
            type: "https://lms-219.dev/problems/precondition",
            title: "Precondition Failed",
            status: 412,
            detail: "Payment/refund status is managed by Stripe webhook and refund console.",
          },
          request,
        );
      }

      const updated = updateDealStatus({
        dealId: id,
        toStatus: status,
        note: parsed.data.note,
        actor: asUserActor(auth.user.id),
        requestId: crypto.randomUUID(),
      });

      return hal(updated, { self: { href: `/api/v1/admin/deals/${id}` } });
    }

    return problem(
      {
        type: "https://lms-219.dev/problems/invalid-input",
        title: "Bad Request",
        status: 400,
        detail: "Invalid action.",
      },
      request,
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

    if (error instanceof DealPreconditionError) {
      return problem(
        {
          type: "https://lms-219.dev/problems/precondition-failed",
          title: "Precondition Failed",
          status: 412,
          detail: `Deal guardrail: ${error.reason}`,
        },
        request,
      );
    }

    return problem(
      {
        type: "https://lms-219.dev/problems/internal",
        title: "Internal Server Error",
        status: 500,
        detail: "Unable to update deal.",
      },
      request,
    );
  }
}

export const GET = withRequestLogging(_GET);
export const PATCH = withRequestLogging(withRateLimit("admin:write", _PATCH));
