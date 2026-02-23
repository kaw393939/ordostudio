import { getEventBySlug } from "../../../../../../lib/api/events";
import { problem } from "../../../../../../lib/api/response";
import { withRequestLogging } from "../../../../../../lib/api/request-logging";
import { EventNotFoundError } from "../../../../../../core/domain/errors";
import { buildIcsContent } from "@/lib/calendar-links";

type RouteContext = {
  params: Promise<{ slug: string }>;
};


async function _GET(request: Request, context: RouteContext) {
  const { slug } = await context.params;

  try {
    const event = getEventBySlug(slug);
    const origin = new URL(request.url).origin;
    const detailsUrl = `${origin}/events/${encodeURIComponent(slug)}`;

    const locationParts: string[] = [];
    if (event.location_text) locationParts.push(event.location_text);
    if (event.meeting_url) locationParts.push(event.meeting_url);

    const body = buildIcsContent({
      title: event.title,
      startIso: event.start_at,
      endIso: event.end_at,
      location: locationParts.length > 0 ? locationParts.join(" · ") : null,
      detailsUrl,
    });

    return new Response(body, {
      status: 200,
      headers: {
        "content-type": "text/calendar; charset=utf-8",
        "cache-control": "no-store",
        "content-disposition": `attachment; filename=\"${slug}.ics\"`,
      },
    });
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
        detail: "Unable to export event calendar.",
      },
      request,
    );
  }
}

export const GET = withRequestLogging(_GET);
