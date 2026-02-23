import { getSessionUserFromRequest, isSameOriginMutation } from "../../../../../../lib/api/auth";
import { hal, problem } from "../../../../../../lib/api/response";
import { withRequestLogging } from "../../../../../../lib/api/request-logging";
import { withRateLimit } from "../../../../../../lib/api/rate-limit-wrapper";
import { listRegistrations } from "../../../../../../lib/api/registrations";
import { getEventBySlug } from "../../../../../../lib/api/events";
import { resolveConfig } from "@/platform/config";
import { EventNotFoundError, UserNotFoundError } from "../../../../../../core/domain/errors";
import { AuditedRegistrationRepository } from "../../../../../../core/infrastructure/decorators/audited-registration-repository";
import { SqliteAuditSink } from "@/adapters/sqlite/audit-sink";
import {
  SqliteEventRepository,
  SqliteRegistrationRepository,
  SqliteUserRepository,
} from "@/adapters/sqlite/repositories";
import { registerParticipant } from "../../../../../../core/use-cases/register-participant";
import { resolveTransactionalEmailPort } from "../../../../../../platform/email";
import { buildRegistrationConfirmationEmail } from "../../../../../../core/use-cases/email-templates";
import { parsePayload } from "../../../../../../lib/api/validate";
import { registrationSchema } from "../../../../../../lib/api/schemas";

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

async function _GET(request: Request, context: RouteContext) {
  const auth = requireSession(request);
  if (auth.error) {
    return auth.error;
  }

  const { slug } = await context.params;
  const status = new URL(request.url).searchParams.get("status") ?? undefined;

  try {
    const event = getEventBySlug(slug);
    const items = listRegistrations(slug, status);
    const isOrganizer = event.engagement_type === "GROUP" && event.created_by === auth.user.id;
    const visibleItems = isAdmin(auth.user.roles) || isOrganizer
      ? items
      : items.filter((item) => item.user_id === auth.user.id);

    return hal(
      {
        count: visibleItems.length,
        items: visibleItems,
      },
      {
        self: { href: `/api/v1/events/${slug}/registrations` },
        event: { href: `/api/v1/events/${slug}` },
      },
    );
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
        detail: "Unable to list registrations.",
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

  const parsed = parsePayload(registrationSchema, raw, request);
  if (!parsed.success) return parsed.response;

  const identifier = parsed.data.user_id ?? parsed.data.user_email ?? auth.user.id;

  let isOrganizer = false;
  try {
    const event = getEventBySlug(slug);
    isOrganizer = event.engagement_type === "GROUP" && event.created_by === auth.user.id;
  } catch {
    isOrganizer = false;
  }

  if (!isAdmin(auth.user.roles) && !isOrganizer) {
    const isSelfById = parsed.data.user_id ? parsed.data.user_id === auth.user.id : true;
    const isSelfByEmail = parsed.data.user_email
      ? parsed.data.user_email.toLowerCase() === auth.user.email.toLowerCase()
      : true;

    if (!isSelfById || !isSelfByEmail) {
      return problem(
        {
          type: "https://lms-219.dev/problems/forbidden",
          title: "Forbidden",
          status: 403,
          detail: "You can only create your own registration.",
        },
        request,
      );
    }
  }

  const config = resolveConfig({ envVars: process.env });
  const users = new SqliteUserRepository(config);
  const events = new SqliteEventRepository(config);
  const requestId = crypto.randomUUID();
  const registrations = new AuditedRegistrationRepository(
    new SqliteRegistrationRepository(config),
    new SqliteAuditSink(config),
    {
      action: "api.registration.add",
      requestId,
      metadata: (args) => ({
        eventSlug: slug,
        actorId: auth.user.id,
        operation: args.operation,
        userId: args.registration?.user_id,
        registrationId: args.registration?.id ?? args.registrationId,
        status: args.registration?.status ?? args.status,
      }),
    },
  );

  try {
    const added = registerParticipant(
      {
        eventSlug: slug,
        userIdentifier: identifier,
      },
      {
        users,
        events,
        registrations,
        id: () => crypto.randomUUID(),
      },
    );

    // Fire-and-forget confirmation email
    if (added.status === "REGISTERED") {
      try {
        const event = getEventBySlug(slug);
        const emailPort = resolveTransactionalEmailPort();
        const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
        emailPort
          .send(
            buildRegistrationConfirmationEmail(
              auth.user.email,
              event.title,
              event.start_at ?? "TBD",
              baseUrl,
            ),
          )
          .catch(() => {});
      } catch {
        // email failure is non-blocking
      }
    }

    return hal(
      { ...added },
      {
        self: { href: `/api/v1/events/${slug}/registrations/${added.user_id}` },
        collection: { href: `/api/v1/events/${slug}/registrations` },
      },
    );
  } catch (error) {
    if (error instanceof EventNotFoundError || error instanceof UserNotFoundError) {
      return problem(
        {
          type: "https://lms-219.dev/problems/not-found",
          title: "Not Found",
          status: 404,
          detail: "Event or user not found.",
        },
        request,
      );
    }

    return problem(
      {
        type: "https://lms-219.dev/problems/internal",
        title: "Internal Server Error",
        status: 500,
        detail: "Unable to add registration.",
      },
      request,
    );
  }
}

export const GET = withRequestLogging(_GET);
export const POST = withRequestLogging(withRateLimit("user:write", _POST));
