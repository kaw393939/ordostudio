import { getSessionUserFromRequest } from "../../../../../lib/api/auth";
import { listRegistrationsForUser } from "../../../../../lib/api/registrations";
import { hal, problem } from "../../../../../lib/api/response";
import { attendanceInstructions } from "../../../../../lib/event-delivery";
import { withRequestLogging } from "../../../../../lib/api/request-logging";

const isCancelable = (item: { status: string; event_status: string }) => {
  return (item.status === "REGISTERED" || item.status === "WAITLISTED") && item.event_status === "PUBLISHED";
};

const sortUpcomingFirst = <T extends { start_at: string }>(items: T[]): T[] => {
  const now = Date.now();
  return [...items].sort((left, right) => {
    const leftStart = new Date(left.start_at).getTime();
    const rightStart = new Date(right.start_at).getTime();

    const leftUpcoming = leftStart >= now;
    const rightUpcoming = rightStart >= now;

    if (leftUpcoming !== rightUpcoming) {
      return leftUpcoming ? -1 : 1;
    }

    if (leftUpcoming) {
      return leftStart - rightStart;
    }

    return rightStart - leftStart;
  });
};

async function _GET(request: Request) {
  const user = getSessionUserFromRequest(request);
  if (!user) {
    return problem(
      {
        type: "https://lms-219.dev/problems/unauthorized",
        title: "Unauthorized",
        status: 401,
        detail: "Active session required.",
      },
      request,
    );
  }

  try {
    const items = sortUpcomingFirst(listRegistrationsForUser(user.id)).map((item) => ({
      ...item,
      how_to_attend: attendanceInstructions({
        deliveryMode: item.delivery_mode,
        locationText: item.location_text,
        meetingUrl: item.meeting_url,
      }),
      _links: {
        event: { href: `/events/${item.event_slug}` },
        ...(isCancelable(item)
          ? {
              "app:cancel": {
                href: `/api/v1/events/${item.event_slug}/registrations/${user.id}`,
              },
            }
          : {}),
      },
    }));
    return hal(
      {
        count: items.length,
        items,
      },
      {
        self: { href: "/api/v1/account/registrations" },
        me: { href: "/api/v1/me" },
      },
      {
        headers: {
          "cache-control": "no-store",
        },
      },
    );
  } catch {
    return problem(
      {
        type: "https://lms-219.dev/problems/internal",
        title: "Internal Server Error",
        status: 500,
        detail: "Unable to load account registrations.",
      },
      request,
    );
  }
}

export const GET = withRequestLogging(_GET);
