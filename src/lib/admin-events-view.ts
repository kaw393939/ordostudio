import type { HalResource } from "./hal-client";

export const getEventActionHrefs = (resource: HalResource) => {
  return {
    publish: resource._links["app:publish"]?.href ?? null,
    cancel: resource._links["app:cancel"]?.href ?? null,
  };
};

export const toEventCreatePayload = (input: {
  slug: string;
  title: string;
  start: string;
  end: string;
  timezone: string;
  engagementType: "INDIVIDUAL" | "GROUP";
  deliveryMode: "ONLINE" | "IN_PERSON" | "HYBRID";
  locationText: string;
  meetingUrl: string;
  capacity?: string;
}) => {
  const payload: Record<string, string | number> = {
    slug: input.slug.trim(),
    title: input.title.trim(),
    start: input.start.trim(),
    end: input.end.trim(),
    timezone: input.timezone.trim(),
    engagement_type: input.engagementType,
    delivery_mode: input.deliveryMode,
  };

  if (input.locationText.trim().length > 0) {
    payload.location_text = input.locationText.trim();
  }

  if (input.meetingUrl.trim().length > 0) {
    payload.meeting_url = input.meetingUrl.trim();
  }

  if (input.capacity && input.capacity.trim().length > 0) {
    payload.capacity = Number(input.capacity);
  }

  return payload;
};
