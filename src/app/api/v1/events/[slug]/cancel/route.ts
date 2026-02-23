import { getSessionUserFromRequest, isSameOriginMutation } from "../../../../../../lib/api/auth";
import { hal, problem } from "../../../../../../lib/api/response";
import { withRequestLogging } from "../../../../../../lib/api/request-logging";
import { withRateLimit } from "../../../../../../lib/api/rate-limit-wrapper";
import { eventLinksForState } from "../../../../../../lib/api/events";
import { resolveConfig } from "@/platform/config";
import { EventNotFoundError, InvalidInputError } from "../../../../../../core/domain/errors";
import { AuditedEventRepository } from "../../../../../../core/infrastructure/decorators/audited-event-repository";
import { SqliteAuditSink } from "@/adapters/sqlite/audit-sink";
import { SqliteEventRepository } from "@/adapters/sqlite/repositories";
import { cancelEvent as cancelEventUseCase } from "../../../../../../core/use-cases/cancel-event";
import { parsePayload } from "../../../../../../lib/api/validate";
import { cancelEventSchema } from "../../../../../../lib/api/schemas";

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

  const parsed = parsePayload(cancelEventSchema, raw, request);
  if (!parsed.success) return parsed.response;

  const config = resolveConfig({ envVars: process.env });
  const requestId = crypto.randomUUID();
  const events = new AuditedEventRepository(new SqliteEventRepository(config), new SqliteAuditSink(config), {
    action: "api.event.cancel",
    requestId,
    metadata: (args) => ({
      operation: args.operation,
      slug,
      actorId: auth.user.id,
      eventId: args.event.id,
      status: args.event.status,
      reason: parsed.data.reason?.trim(),
    }),
  });

  try {
    const cancelled = cancelEventUseCase(
      {
        slug,
        reason: parsed.data.reason,
      },
      {
        events,
        now: () => new Date().toISOString(),
      },
    );

    return hal({ ...cancelled }, eventLinksForState(cancelled.slug, cancelled.status));
  } catch (error) {
    if (error instanceof InvalidInputError) {
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

    if (error instanceof EventNotFoundError) {
      return problem(
        {
          type: "https://lms-219.dev/problems/not-found",
          title: "Not Found",
          status: 404,
          detail: "Event not found.",
        },
        request,
      );
    }

    return problem(
      {
        type: "https://lms-219.dev/problems/internal",
        title: "Internal Server Error",
        status: 500,
        detail: "Unable to cancel event.",
      },
      request,
    );
  }
}

export const POST = withRequestLogging(withRateLimit("user:write", _POST));
