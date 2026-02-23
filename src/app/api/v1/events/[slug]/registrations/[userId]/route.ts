import { getSessionUserFromRequest, isSameOriginMutation } from "../../../../../../../lib/api/auth";
import { hal, problem } from "../../../../../../../lib/api/response";
import { withRequestLogging } from "../../../../../../../lib/api/request-logging";
import { withRateLimit } from "../../../../../../../lib/api/rate-limit-wrapper";
import { resolveConfig } from "@/platform/config";
import {
  EventNotFoundError,
  RegistrationNotFoundError,
  UserNotFoundError,
} from "../../../../../../../core/domain/errors";
import { AuditedRegistrationRepository } from "../../../../../../../core/infrastructure/decorators/audited-registration-repository";
import { SqliteAuditSink } from "@/adapters/sqlite/audit-sink";
import {
  SqliteEventRepository,
  SqliteRegistrationRepository,
  SqliteUserRepository,
} from "@/adapters/sqlite/repositories";
import { removeParticipant } from "../../../../../../../core/use-cases/remove-participant";
import { getEventBySlug } from "../../../../../../../lib/api/events";

type RouteContext = {
  params: Promise<{ slug: string; userId: string }>;
};

const requireSession = (request: Request) => {
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

  return { user };
};

const isAdmin = (roles: string[]): boolean => {
  return roles.includes("ADMIN") || roles.includes("SUPER_ADMIN");
};

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

  const auth = requireSession(request);
  if (auth.error) {
    return auth.error;
  }

  const { slug, userId } = await context.params;

  let isOrganizer = false;
  try {
    const event = getEventBySlug(slug);
    isOrganizer = event.engagement_type === "GROUP" && event.created_by === auth.user.id;
  } catch {
    isOrganizer = false;
  }

  if (!isAdmin(auth.user.roles) && !isOrganizer && userId !== auth.user.id) {
    return problem(
      {
        type: "https://lms-219.dev/problems/forbidden",
        title: "Forbidden",
        status: 403,
        detail: "You can only cancel your own registration.",
      },
      request,
    );
  }

  const config = resolveConfig({ envVars: process.env });
  const users = new SqliteUserRepository(config);
  const events = new SqliteEventRepository(config);
  const requestId = crypto.randomUUID();
  const registrations = new AuditedRegistrationRepository(
    new SqliteRegistrationRepository(config),
    new SqliteAuditSink(config),
    {
      action: "api.registration.cancel",
      requestId,
      metadata: (args) => ({
        eventSlug: slug,
        actorId: auth.user.id,
        operation: args.operation,
        userId,
        registrationId: args.registration?.id ?? args.registrationId,
        status: args.registration?.status ?? args.status,
      }),
    },
  );

  try {
    const removed = removeParticipant(
      {
        eventSlug: slug,
        userIdentifier: userId,
      },
      {
        users,
        events,
        registrations,
      },
    );

    return hal(
      { ...removed },
      {
        self: { href: `/api/v1/events/${slug}/registrations/${userId}` },
        collection: { href: `/api/v1/events/${slug}/registrations` },
      },
    );
  } catch (error) {
    if (
      error instanceof EventNotFoundError ||
      error instanceof UserNotFoundError ||
      error instanceof RegistrationNotFoundError
    ) {
      return problem(
        {
          type: "https://lms-219.dev/problems/not-found",
          title: "Not Found",
          status: 404,
          detail: "Registration not found.",
        },
        request,
      );
    }

    return problem(
      {
        type: "https://lms-219.dev/problems/internal",
        title: "Internal Server Error",
        status: 500,
        detail: "Unable to remove registration.",
      },
      request,
    );
  }
}

export const DELETE = withRequestLogging(withRateLimit("user:write", _DELETE));
