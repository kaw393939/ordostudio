import { IngestedItemInput } from "../../lib/api/ingestion";

export const fetchYoutubeTranscripts = async (channelId: string): Promise<IngestedItemInput[]> => {
  // In a real implementation, this would fetch from the YouTube API
  // For this example, we return mock data
  return [
    {
      sourceType: "youtube",
      externalId: `youtube-video-456`,
      canonicalUrl: `https://youtube.com/watch?v=456`,
      title: "Introduction to MCP",
      summary: "Learn about the Model Context Protocol and how it can be used to build powerful AI agents.",
      rawPayload: {
        id: "456",
        snippet: {
          title: "Introduction to MCP",
          description: "Learn about the Model Context Protocol and how it can be used to build powerful AI agents.",
          channelId,
        },
        transcript: "Welcome to this introduction to MCP...",
      },
      normalizedPayload: {
        title: "Introduction to MCP",
        description: "Learn about the Model Context Protocol and how it can be used to build powerful AI agents.",
        transcript: "Welcome to this introduction to MCP...",
        duration: "10:00",
      },
    },
  ];
};
