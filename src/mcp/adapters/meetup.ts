import { IngestedItemInput } from "../../lib/api/ingestion";

export const fetchMeetupEvents = async (groupId: string): Promise<IngestedItemInput[]> => {
  // In a real implementation, this would fetch from the Meetup API
  // For this example, we return mock data
  return [
    {
      sourceType: "meetup",
      externalId: `meetup-event-123`,
      canonicalUrl: `https://meetup.com/${groupId}/events/123`,
      title: "Monthly Tech Meetup",
      summary: "Join us for our monthly tech meetup where we discuss the latest trends.",
      rawPayload: {
        id: "123",
        name: "Monthly Tech Meetup",
        description: "Join us for our monthly tech meetup where we discuss the latest trends.",
        time: new Date().getTime(),
        group: { id: groupId, name: "Tech Group" },
      },
      normalizedPayload: {
        title: "Monthly Tech Meetup",
        description: "Join us for our monthly tech meetup where we discuss the latest trends.",
        date: new Date().toISOString(),
        location: "Online",
      },
    },
  ];
};
