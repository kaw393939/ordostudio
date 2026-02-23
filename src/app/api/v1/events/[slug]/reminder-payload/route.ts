import { getSessionUserFromRequest } from "../../../../../../lib/api/auth";
import { getEventBySlug } from "../../../../../../lib/api/events";
import { hal, problem } from "../../../../../../lib/api/response";
import { withRequestLogging } from "../../../../../../lib/api/request-logging";
import { buildReminderPayload } from "../../../../../../lib/event-delivery";
import { EventNotFoundError } from "../../../../../../core/domain/errors";

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

async function _GET(request: Request, context: RouteContext) {
  const auth = requireAdmin(request);
  if (auth.error) {
    return auth.error;
  }

  const { slug } = await context.params;

  try {
    const event = getEventBySlug(slug);

    return hal(
      buildReminderPayload({
        title: event.title,
        startAt: event.start_at,
        timezone: event.timezone,
        deliveryMode: event.delivery_mode,
        locationText: event.location_text,
        meetingUrl: event.meeting_url,
      }),
      {
        self: { href: `/api/v1/events/${slug}/reminder-payload` },
        event: { href: `/api/v1/events/${slug}` },
      },
      {
        headers: {
          "cache-control": "no-store",
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
        detail: "Unable to build reminder payload.",
      },
      request,
    );
  }
}

export const GET = withRequestLogging(_GET);
