import { describe, it, expect } from "vitest";
import { aggregateFeed, FeedItem } from "../feed";
import { UserRegistrationHistoryReadRow } from "../../../adapters/sqlite/read-repositories";
import { MyEngagementTimelineItem, EngagementFollowUpAction } from "../engagements";

describe("aggregateFeed", () => {
  it("returns an empty array when no data is provided", () => {
    const result = aggregateFeed({ registrations: [], timelineItems: [], followUpActions: [] });
    expect(result).toEqual([]);
  });

  it("aggregates and maps different types of data into FeedItems", () => {
    const registrations: UserRegistrationHistoryReadRow[] = [
      {
        registration_id: "reg-1",
        event_id: "evt-1",
        event_slug: "evt-1-slug",
        event_title: "Test Event",
        event_status: "PUBLISHED",
        start_at: "2026-03-01T10:00:00Z",
        end_at: "2026-03-01T11:00:00Z",
        timezone: "UTC",
        delivery_mode: "ONLINE",
        engagement_type: "INDIVIDUAL",
        location_text: null,
        meeting_url: null,
        instructor_state: "ASSIGNED",
        instructor_name: "John Doe",
        status: "REGISTERED",
      },
    ];

    const timelineItems: MyEngagementTimelineItem[] = [
      {
        registration_id: "reg-2",
        event_slug: "evt-2-slug",
        event_title: "Past Event",
        start_at: "2026-01-01T10:00:00Z",
        timezone: "UTC",
        timeline_status: "DELIVERED",
        outcomes_count: 1,
        open_action_items: 0,
        blocked_action_items: 0,
        artifacts_count: 0,
        pending_reminders: 0,
        next_step: null,
        feedback_submitted: true,
      },
    ];

    const followUpActions: EngagementFollowUpAction[] = [
      {
        id: "act-1",
        session_id: "evt-3",
        session_title: "Action Event",
        description: "Do the homework",
        status: "OPEN",
        due_at: "2026-02-25T10:00:00Z",
        owner_user_id: "user-1",
        created_at: "2026-02-20T10:00:00Z",
        updated_at: "2026-02-20T10:00:00Z",
      },
    ];

    const result = aggregateFeed({ registrations, timelineItems, followUpActions });
    
    expect(result).toHaveLength(3);
    
    // Check mapping
    const regItem = result.find(r => r.id === "reg-reg-1");
    expect(regItem).toMatchObject({
      id: "reg-reg-1",
      type: "AccountRegistration",
      timestamp: "2026-03-01T10:00:00Z",
      title: "Test Event",
      description: "Registered for event",
    });

    const timelineItem = result.find(r => r.id === "timeline-reg-2");
    expect(timelineItem).toMatchObject({
      id: "timeline-reg-2",
      type: "EngagementTimelineItem",
      timestamp: "2026-01-01T10:00:00Z",
      title: "Past Event",
      description: "Event delivered",
    });

    const actionItem = result.find(r => r.id === "act-1");
    expect(actionItem).toMatchObject({
      id: "act-1",
      type: "FollowUpAction",
      timestamp: "2026-02-25T10:00:00Z",
      title: "Action Event - Follow Up",
      description: "Do the homework",
    });
  });

  it("sorts items chronologically (newest first)", () => {
    const registrations: UserRegistrationHistoryReadRow[] = [
      {
        registration_id: "reg-1",
        event_id: "evt-1",
        event_slug: "evt-1-slug",
        event_title: "Test Event",
        event_status: "PUBLISHED",
        start_at: "2026-03-01T10:00:00Z",
        end_at: "2026-03-01T11:00:00Z",
        timezone: "UTC",
        delivery_mode: "ONLINE",
        engagement_type: "INDIVIDUAL",
        location_text: null,
        meeting_url: null,
        instructor_state: "ASSIGNED",
        instructor_name: "John Doe",
        status: "REGISTERED",
      },
    ];

    const timelineItems: MyEngagementTimelineItem[] = [
      {
        registration_id: "reg-2",
        event_slug: "evt-2-slug",
        event_title: "Past Event",
        start_at: "2026-01-01T10:00:00Z",
        timezone: "UTC",
        timeline_status: "DELIVERED",
        outcomes_count: 1,
        open_action_items: 0,
        blocked_action_items: 0,
        artifacts_count: 0,
        pending_reminders: 0,
        next_step: null,
        feedback_submitted: true,
      },
    ];

    const result = aggregateFeed({ registrations, timelineItems, followUpActions: [] });
    
    // Newest first means 2026-03-01 comes before 2026-01-01
    expect(result[0].id).toBe("reg-reg-1");
    expect(result[1].id).toBe("timeline-reg-2");
  });

  it("filters items by type", () => {
    const registrations: UserRegistrationHistoryReadRow[] = [
      {
        registration_id: "reg-1",
        event_id: "evt-1",
        event_slug: "evt-1-slug",
        event_title: "Test Event",
        event_status: "PUBLISHED",
        start_at: "2026-03-01T10:00:00Z",
        end_at: "2026-03-01T11:00:00Z",
        timezone: "UTC",
        delivery_mode: "ONLINE",
        engagement_type: "INDIVIDUAL",
        location_text: null,
        meeting_url: null,
        instructor_state: "ASSIGNED",
        instructor_name: "John Doe",
        status: "REGISTERED",
      },
    ];

    const followUpActions: EngagementFollowUpAction[] = [
      {
        id: "act-1",
        session_id: "evt-3",
        session_title: "Action Event",
        description: "Do the homework",
        status: "OPEN",
        due_at: "2026-02-25T10:00:00Z",
        owner_user_id: "user-1",
        created_at: "2026-02-20T10:00:00Z",
        updated_at: "2026-02-20T10:00:00Z",
      },
    ];

    const result = aggregateFeed({ registrations, timelineItems: [], followUpActions }, { type: "action_required" });
    
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("act-1");
  });
});
