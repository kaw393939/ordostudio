import { getSessionUserFromRequest, isSameOriginMutation } from "../../../../../../lib/api/auth";
import { hal, problem } from "../../../../../../lib/api/response";
import { withRequestLogging } from "../../../../../../lib/api/request-logging";
import { withRateLimit } from "../../../../../../lib/api/rate-limit-wrapper";
import { eventLinksForState } from "../../../../../../lib/api/events";
import { resolveConfig } from "@/platform/config";
import { EventNotFoundError } from "../../../../../../core/domain/errors";
import { AuditedEventRepository } from "../../../../../../core/infrastructure/decorators/audited-event-repository";
import { SqliteAuditSink } from "@/adapters/sqlite/audit-sink";
import { SqliteEventRepository } from "@/adapters/sqlite/repositories";
import { publishEvent as publishEventUseCase } from "../../../../../../core/use-cases/publish-event";

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
  const config = resolveConfig({ envVars: process.env });
  const requestId = crypto.randomUUID();
  const events = new AuditedEventRepository(new SqliteEventRepository(config), new SqliteAuditSink(config), {
    action: "api.event.publish",
    requestId,
    metadata: (args) => ({
      operation: args.operation,
      slug,
      actorId: auth.user.id,
      eventId: args.event.id,
      status: args.event.status,
    }),
  });

  try {
    const result = publishEventUseCase(
      { slug },
      {
        events,
        now: () => new Date().toISOString(),
      },
    );

    if (result.idempotent) {
      new SqliteAuditSink(config).record({
        action: "api.event.publish",
        requestId,
        targetType: "event",
        metadata: {
          slug,
          actorId: auth.user.id,
          idempotent: true,
        },
      });
    }

    const published = result.event;
    return hal({ ...published }, eventLinksForState(published.slug, published.status));
  } catch (error) {
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
        detail: "Unable to publish event.",
      },
      request,
    );
  }
}

export const POST = withRequestLogging(withRateLimit("user:write", _POST));
