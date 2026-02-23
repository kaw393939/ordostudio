import { getSessionUserFromRequest, isSameOriginMutation } from "../../../../../../../lib/api/auth";
import { getEventBySlug } from "../../../../../../../lib/api/events";
import { hal, problem } from "../../../../../../../lib/api/response";
import { withRequestLogging } from "../../../../../../../lib/api/request-logging";
import { withRateLimit } from "../../../../../../../lib/api/rate-limit-wrapper";
import { resolveConfig } from "@/platform/config";
import {
  EventNotFoundError,
  InvalidInputError,
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
import { registerParticipant } from "../../../../../../../core/use-cases/register-participant";
import { removeParticipant } from "../../../../../../../core/use-cases/remove-participant";
import { parsePayload } from "../../../../../../../lib/api/validate";
import { substitutionSchema } from "../../../../../../../lib/api/schemas";

type RouteContext = {
  params: Promise<{ slug: string }>;
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

  const auth = requireSession(request);
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

  const parsed = parsePayload(substitutionSchema, raw, request);
  if (!parsed.success) return parsed.response;

  if (parsed.data.from_user_id === parsed.data.to_user_id) {
    return problem(
      {
        type: "https://lms-219.dev/problems/invalid-input",
        title: "Bad Request",
        status: 400,
        detail: "Substitution requires two different users.",
      },
      request,
    );
  }

  try {
    const event = getEventBySlug(slug);
    const isOrganizer = event.engagement_type === "GROUP" && event.created_by === auth.user.id;

    if (!isAdmin(auth.user.roles) && !isOrganizer) {
      return problem(
        {
          type: "https://lms-219.dev/problems/forbidden",
          title: "Forbidden",
          status: 403,
          detail: "Only organizer or admin can substitute group participants.",
        },
        request,
      );
    }

    if (event.engagement_type !== "GROUP") {
      return problem(
        {
          type: "https://lms-219.dev/problems/invalid-input",
          title: "Bad Request",
          status: 400,
          detail: "Substitution is only available for group engagements.",
        },
        request,
      );
    }

    const config = resolveConfig({ envVars: process.env });
    const users = new SqliteUserRepository(config);
    const events = new SqliteEventRepository(config);
    const audit = new SqliteAuditSink(config);

    const removeRepo = new AuditedRegistrationRepository(new SqliteRegistrationRepository(config), audit, {
      action: "api.registration.substitute.remove",
      requestId: crypto.randomUUID(),
      metadata: (args) => ({
        eventSlug: slug,
        actorId: auth.user.id,
        operation: args.operation,
        userId: parsed.data.from_user_id,
        replacementUserId: parsed.data.to_user_id,
      }),
    });

    const removed = removeParticipant(
      {
        eventSlug: slug,
        userIdentifier: parsed.data.from_user_id,
      },
      {
        users,
        events,
        registrations: removeRepo,
      },
    );

    const addRepo = new AuditedRegistrationRepository(new SqliteRegistrationRepository(config), audit, {
      action: "api.registration.substitute.add",
      requestId: crypto.randomUUID(),
      metadata: (args) => ({
        eventSlug: slug,
        actorId: auth.user.id,
        operation: args.operation,
        userId: parsed.data.to_user_id,
        replacedUserId: parsed.data.from_user_id,
      }),
    });

    const added = registerParticipant(
      {
        eventSlug: slug,
        userIdentifier: parsed.data.to_user_id,
      },
      {
        users,
        events,
        registrations: addRepo,
        id: () => crypto.randomUUID(),
      },
    );

    return hal(
      {
        event_slug: slug,
        from_user_id: removed.user_id,
        to_user_id: added.user_id,
        removed_status: removed.status,
        added_status: added.status,
      },
      {
        self: { href: `/api/v1/events/${slug}/registrations/substitutions` },
        registrations: { href: `/api/v1/events/${slug}/registrations` },
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
          detail: "Event or registration not found.",
        },
        request,
      );
    }

    if (error instanceof InvalidInputError) {
      return problem(
        {
          type: "https://lms-219.dev/problems/invalid-input",
          title: "Bad Request",
          status: 400,
          detail: "Invalid substitution payload.",
        },
        request,
      );
    }

    return problem(
      {
        type: "https://lms-219.dev/problems/internal",
        title: "Internal Server Error",
        status: 500,
        detail: "Unable to substitute participant.",
      },
      request,
    );
  }
}

export const POST = withRequestLogging(withRateLimit("user:write", _POST));
