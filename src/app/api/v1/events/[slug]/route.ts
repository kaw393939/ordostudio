import { getSessionUserFromRequest, isSameOriginMutation } from "../../../../../lib/api/auth";
import { listRegistrations } from "../../../../../lib/api/registrations";
import { hal, problem } from "../../../../../lib/api/response";
import { withRequestLogging } from "../../../../../lib/api/request-logging";
import { withRateLimit } from "../../../../../lib/api/rate-limit-wrapper";
import { eventLinksForState, getEventBySlug } from "../../../../../lib/api/events";
import { resolveConfig } from "@/platform/config";
import { EventNotFoundError, InvalidInputError } from "../../../../../core/domain/errors";
import { AuditedEventRepository } from "../../../../../core/infrastructure/decorators/audited-event-repository";
import { SqliteAuditSink } from "@/adapters/sqlite/audit-sink";
import { SqliteEventRepository } from "@/adapters/sqlite/repositories";
import { updateEvent as updateEventUseCase } from "../../../../../core/use-cases/update-event";
import { buildReminderPayload } from "../../../../../lib/event-delivery";
import { nowISO } from "@/lib/date-time";
import { parsePayload } from "../../../../../lib/api/validate";
import { updateEventSchema } from "../../../../../lib/api/schemas";

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

const isAdmin = (roles: string[]): boolean => {
  return roles.includes("ADMIN") || roles.includes("SUPER_ADMIN");
};

const withReminderLink = (slug: string, status: "DRAFT" | "PUBLISHED" | "CANCELLED") => {
  const links = eventLinksForState(slug, status);
  links["app:reminder-payload"] = { href: `/api/v1/events/${slug}/reminder-payload` };
  return links;
};

async function _GET(request: Request, context: RouteContext) {
  const { slug } = await context.params;

  try {
    const found = getEventBySlug(slug);
    const links = withReminderLink(found.slug, found.status);
    if (found.status === "PUBLISHED") {
      const registeredCount = listRegistrations(found.slug, "REGISTERED").length;
      const isFull = typeof found.capacity === "number" && found.capacity > 0 && registeredCount >= found.capacity;
      if (isFull) {
        links["app:join-waitlist"] = { href: `/api/v1/events/${found.slug}/registrations` };
      } else {
        links["app:register"] = { href: `/api/v1/events/${found.slug}/registrations` };
      }
    }

    const sessionUser = getSessionUserFromRequest(request);
    if (sessionUser) {
      links["app:my-registration"] = {
        href: `/api/v1/events/${found.slug}/registrations/${sessionUser.id}`,
      };

      const isOrganizer = found.engagement_type === "GROUP" && found.created_by === sessionUser.id;
      if (found.engagement_type === "GROUP" && (isOrganizer || isAdmin(sessionUser.roles))) {
        links["app:group-roster"] = { href: `/api/v1/events/${found.slug}/registrations` };
        links["app:group-substitute"] = { href: `/api/v1/events/${found.slug}/registrations/substitutions` };
      }
    }

    return hal(
      {
        ...found,
        reminder_payload: buildReminderPayload({
          title: found.title,
          startAt: found.start_at,
          timezone: found.timezone,
          deliveryMode: found.delivery_mode,
          locationText: found.location_text,
          meetingUrl: found.meeting_url,
        }),
      },
      links,
      {
        headers: {
          "cache-control": "private, max-age=30, stale-while-revalidate=60",
        },
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
        detail: "Unable to load event.",
      },
      request,
    );
  }
}

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

  const parsed = parsePayload(updateEventSchema, raw, request);
  if (!parsed.success) return parsed.response;

  const config = resolveConfig({ envVars: process.env });
  const requestId = crypto.randomUUID();
  const events = new AuditedEventRepository(new SqliteEventRepository(config), new SqliteAuditSink(config), {
    action: "api.event.update",
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
    const updated = updateEventUseCase(
      {
        slug,
        title: parsed.data.title,
        start: parsed.data.start,
        end: parsed.data.end,
        capacity: parsed.data.capacity ?? undefined,
        engagementType: parsed.data.engagement_type,
        deliveryMode: parsed.data.delivery_mode,
        locationText: parsed.data.location_text ?? undefined,
        meetingUrl: parsed.data.meeting_url ?? undefined,
        description: parsed.data.description ?? undefined,
        metadataJson: parsed.data.metadata_json ?? undefined,
      },
      {
        events,
        now: nowISO,
      },
    );

    return hal(
      {
        ...updated,
        reminder_payload: buildReminderPayload({
          title: updated.title,
          startAt: updated.start_at,
          timezone: updated.timezone,
          deliveryMode: updated.delivery_mode ?? "ONLINE",
          locationText: updated.location_text ?? null,
          meetingUrl: updated.meeting_url ?? null,
        }),
      },
      withReminderLink(updated.slug, updated.status),
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

    if (error instanceof InvalidInputError) {
      return problem(
        {
          type: "https://lms-219.dev/problems/invalid-input",
          title: "Bad Request",
          status: 400,
          detail: "Invalid event update payload.",
        },
        request,
      );
    }

    return problem(
      {
        type: "https://lms-219.dev/problems/internal",
        title: "Internal Server Error",
        status: 500,
        detail: "Unable to update event.",
      },
      request,
    );
  }
}

export const GET = withRequestLogging(_GET);
export const PATCH = withRequestLogging(withRateLimit("user:write", _PATCH));
