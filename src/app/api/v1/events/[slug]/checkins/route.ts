import { getSessionUserFromRequest, isSameOriginMutation } from "../../../../../../lib/api/auth";
import { hal, problem } from "../../../../../../lib/api/response";
import { withRequestLogging } from "../../../../../../lib/api/request-logging";
import { withRateLimit } from "../../../../../../lib/api/rate-limit-wrapper";
import { resolveConfig } from "@/platform/config";
import {
  CancelledRegistrationCheckinError,
  EventNotFoundError,
  RegistrationNotFoundError,
  UserNotFoundError,
} from "../../../../../../core/domain/errors";
import { AuditedRegistrationRepository } from "../../../../../../core/infrastructure/decorators/audited-registration-repository";
import { SqliteAuditSink } from "@/adapters/sqlite/audit-sink";
import {
  SqliteEventRepository,
  SqliteRegistrationRepository,
  SqliteUserRepository,
} from "@/adapters/sqlite/repositories";
import { checkInParticipant } from "../../../../../../core/use-cases/check-in-participant";
import { parsePayload } from "../../../../../../lib/api/validate";
import { checkinSchema } from "../../../../../../lib/api/schemas";

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

  const parsed = parsePayload(checkinSchema, raw, request);
  if (!parsed.success) return parsed.response;

  const identifier = parsed.data.user_id ?? parsed.data.user_email;
  if (!identifier) {
    return problem(
      {
        type: "https://lms-219.dev/problems/invalid-input",
        title: "Bad Request",
        status: 400,
        detail: "user_id or user_email is required.",
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
      action: "api.registration.checkin",
      requestId,
      metadata: (args) => ({
        eventSlug: slug,
        actorId: auth.user.id,
        operation: args.operation,
        userIdentifier: identifier,
        userId: args.registration?.user_id,
        registrationId: args.registration?.id ?? args.registrationId,
        status: args.registration?.status ?? args.status,
      }),
    },
  );

  try {
    const checkedIn = checkInParticipant(
      {
        eventSlug: slug,
        userIdentifier: identifier,
      },
      {
        users,
        events,
        registrations,
      },
    );

    return hal(
      { ...checkedIn },
      {
        self: { href: `/api/v1/events/${slug}/checkins` },
        registration: { href: `/api/v1/events/${slug}/registrations/${checkedIn.user_id}` },
      },
    );
  } catch (error) {
    if (error instanceof CancelledRegistrationCheckinError) {
      return problem(
        {
          type: "https://lms-219.dev/problems/precondition-failed",
          title: "Precondition Failed",
          status: 412,
          detail: "Cannot check in a cancelled registration.",
        },
        request,
      );
    }

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
        detail: "Unable to check in registration.",
      },
      request,
    );
  }
}

export const POST = withRequestLogging(withRateLimit("user:write", _POST));
