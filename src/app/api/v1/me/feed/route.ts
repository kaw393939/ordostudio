import { getSessionUserFromRequest } from "../../../../../lib/api/auth";
import { listRegistrationsForUser } from "../../../../../lib/api/registrations";
import { listMyEngagementTimeline, listAllMyFollowUpActions } from "../../../../../lib/api/engagements";
import { aggregateFeed, AggregateFeedOptions } from "../../../../../lib/api/feed";
import { hal, problem } from "../../../../../lib/api/response";
import { withRequestLogging } from "../../../../../lib/api/request-logging";

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
    const url = new URL(request.url);
    const typeParam = url.searchParams.get("type");
    const pageParam = url.searchParams.get("page");
    const limitParam = url.searchParams.get("limit");
    
    let type: AggregateFeedOptions["type"] = undefined;
    if (typeParam === "upcoming" || typeParam === "history" || typeParam === "action_required") {
      type = typeParam;
    }

    const page = pageParam ? parseInt(pageParam, 10) : 1;
    const limit = limitParam ? parseInt(limitParam, 10) : 10;

    const registrations = listRegistrationsForUser(user.id);
    const timelineItems = listMyEngagementTimeline(user.id);
    const followUpActions = listAllMyFollowUpActions(user.id);

    const allFeedItems = aggregateFeed(
      { registrations, timelineItems, followUpActions },
      { type }
    );

    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const feedItems = allFeedItems.slice(startIndex, endIndex);
    const hasMore = endIndex < allFeedItems.length;

    const links: Record<string, { href: string }> = {
      self: { href: `/api/v1/me/feed${url.search}` },
    };
    if (hasMore) {
      links.next = { href: `/api/v1/me/feed?page=${page + 1}&limit=${limit}${typeParam ? `&type=${typeParam}` : ""}` };
    }

    return hal(
      {
        count: feedItems.length,
        total: allFeedItems.length,
        page,
        limit,
        hasMore,
        items: feedItems,
      },
      links,
    );
  } catch (error) {
    console.error("Failed to fetch feed:", error);
    return problem(
      {
        type: "https://lms-219.dev/problems/internal-error",
        title: "Internal Server Error",
        status: 500,
        detail: "An unexpected error occurred while fetching the feed.",
      },
      request,
    );
  }
}

export const GET = withRequestLogging(_GET);
