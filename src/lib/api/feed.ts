import { UserRegistrationHistoryReadRow } from "../../adapters/sqlite/read-repositories";
import { MyEngagementTimelineItem, EngagementFollowUpAction } from "./engagements";

export interface FeedItem {
  id: string;
  type: "AccountRegistration" | "EngagementTimelineItem" | "FollowUpAction" | "OnboardingProgress" | "SubscriptionEvent" | "TriageTicket";
  timestamp: string;
  title: string;
  description: string;
  actionUrl?: string;
}

export interface AggregateFeedArgs {
  registrations: UserRegistrationHistoryReadRow[];
  timelineItems: MyEngagementTimelineItem[];
  followUpActions: EngagementFollowUpAction[];
}

export interface AggregateFeedOptions {
  type?: "upcoming" | "history" | "action_required";
}

export function aggregateFeed(
  data: AggregateFeedArgs,
  options?: AggregateFeedOptions
): FeedItem[] {
  const items: FeedItem[] = [];

  for (const reg of data.registrations) {
    items.push({
      id: reg.registration_id,
      type: "AccountRegistration",
      timestamp: reg.start_at,
      title: reg.event_title,
      description: "Registered for event",
      actionUrl: `/events/${reg.event_slug}`,
    });
  }

  for (const timeline of data.timelineItems) {
    items.push({
      id: timeline.registration_id,
      type: "EngagementTimelineItem",
      timestamp: timeline.start_at,
      title: timeline.event_title,
      description: "Event delivered",
      actionUrl: `/events/${timeline.event_slug}`,
    });
  }

  for (const action of data.followUpActions) {
    items.push({
      id: action.id,
      type: "FollowUpAction",
      timestamp: action.due_at || action.created_at || new Date().toISOString(),
      title: action.session_title ? `${action.session_title} - Follow Up` : "Follow Up Action",
      description: action.description,
      actionUrl: `/engagements/${action.session_id}/actions/${action.id}`,
    });
  }

  // Sort chronologically (newest first)
  items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // Filter
  if (options?.type) {
    if (options.type === "action_required") {
      return items.filter(item => item.type === "FollowUpAction");
    }
    if (options.type === "upcoming") {
      const now = new Date().getTime();
      return items.filter(item => new Date(item.timestamp).getTime() > now);
    }
    if (options.type === "history") {
      const now = new Date().getTime();
      return items.filter(item => new Date(item.timestamp).getTime() <= now);
    }
  }

  return items;
}
