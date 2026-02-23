import { getSessionUserFromRequest, isSameOriginMutation } from "../../../../lib/api/auth";
import { hal, problem } from "../../../../lib/api/response";
import { withRequestLogging } from "../../../../lib/api/request-logging";
import { withRateLimit } from "../../../../lib/api/rate-limit-wrapper";
import { eventLinksForState, listEvents } from "../../../../lib/api/events";
import { resolveConfig } from "@/platform/config";
import { EventAlreadyExistsError, InvalidInputError } from "../../../../core/domain/errors";
import { AuditedEventRepository } from "../../../../core/infrastructure/decorators/audited-event-repository";
import { SqliteAuditSink } from "@/adapters/sqlite/audit-sink";
import { SqliteEventRepository } from "@/adapters/sqlite/repositories";
import { createEvent as createEventUseCase } from "../../../../core/use-cases/create-event";
import { buildReminderPayload } from "../../../../lib/event-delivery";
import { nowISO } from "@/lib/date-time";
import { parsePayload } from "../../../../lib/api/validate";
import { createEventSchema } from "../../../../lib/api/schemas";

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

const withReminderLink = (slug: string, status: string) => {
  const links = eventLinksForState(slug, status as "DRAFT" | "PUBLISHED" | "CANCELLED");
  links["app:reminder-payload"] = { href: `/api/v1/events/${slug}/reminder-payload` };
  return links;
};

async function _GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") ?? undefined;
  const q = searchParams.get("q") ?? undefined;
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;
  const limit = searchParams.get("limit");
  const offset = searchParams.get("offset");

  try {
    const result = listEvents({
      status,
      q,
      from,
      to,
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
          _links: withReminderLink(item.slug, item.status),
          reminder_payload: buildReminderPayload({
            title: item.title,
            startAt: item.start_at,
            timezone: item.timezone,
            deliveryMode: item.delivery_mode,
            locationText: item.location_text,
            meetingUrl: item.meeting_url,
          }),
        })),
      },
      {
        self: { href: "/api/v1/events" },
      },
      {
        headers: {
          "cache-control": "private, max-age=30, stale-while-revalidate=60",
        },
      },
    );
  } catch {
    return problem(
      {
        type: "https://lms-219.dev/problems/invalid-input",
        title: "Bad Request",
        status: 400,
        detail: "Invalid event filter input.",
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

  const auth = requireAdmin(request);
  if (auth.error) {
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

  const parsed = parsePayload(createEventSchema, raw, request);
  if (!parsed.success) return parsed.response;

  const config = resolveConfig({ envVars: process.env });
  const requestId = crypto.randomUUID();
  const events = new AuditedEventRepository(new SqliteEventRepository(config), new SqliteAuditSink(config), {
    action: "api.event.create",
    requestId,
    metadata: (args) => ({
      operation: args.operation,
      eventId: args.event.id,
      slug: args.event.slug,
      actorId: auth.user.id,
      status: args.event.status,
    }),
  });

  try {
    const created = createEventUseCase(
      {
        slug: parsed.data.slug,
        title: parsed.data.title,
        start: parsed.data.start,
        end: parsed.data.end,
        timezone: parsed.data.timezone,
        capacity: parsed.data.capacity ?? undefined,
            engagementType: parsed.data.engagement_type,
            deliveryMode: parsed.data.delivery_mode,
            locationText: parsed.data.location_text ?? undefined,
            meetingUrl: parsed.data.meeting_url ?? undefined,
        description: parsed.data.description ?? undefined,
        metadataJson: parsed.data.metadata_json ?? undefined,
        createdBy: auth.user.id,
      },
      {
        events,
        id: () => crypto.randomUUID(),
        now: nowISO,
      },
    );

    return hal(
      { ...created },
      withReminderLink(created.slug, created.status),
      {
        status: 201,
      },
    );
  } catch (error) {
    if (error instanceof EventAlreadyExistsError) {
      return problem(
        {
          type: "https://lms-219.dev/problems/conflict",
          title: "Conflict",
          status: 409,
          detail: "Event already exists for slug.",
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
          detail: "Invalid event payload.",
        },
        request,
      );
    }

    return problem(
      {
        type: "https://lms-219.dev/problems/internal",
        title: "Internal Server Error",
        status: 500,
        detail: "Unable to create event.",
      },
      request,
    );
  }
}

export const GET = withRequestLogging(_GET);
export const POST = withRequestLogging(withRateLimit("user:write", _POST));
