export type DeliveryMode = "ONLINE" | "IN_PERSON" | "HYBRID";

export type EventDeliveryInput = {
  title: string;
  startAt: string;
  timezone: string;
  deliveryMode: DeliveryMode;
  locationText: string | null;
  meetingUrl: string | null;
};

export const attendanceInstructions = (input: {
  deliveryMode: DeliveryMode;
  locationText: string | null;
  meetingUrl: string | null;
}): string => {
  if (input.deliveryMode === "ONLINE") {
    return input.meetingUrl ? `Attend online via ${input.meetingUrl}` : "Attend online. Meeting link will be provided.";
  }

  if (input.deliveryMode === "IN_PERSON") {
    return input.locationText ? `Attend in person at ${input.locationText}` : "Attend in person. Location details pending.";
  }

  const location = input.locationText ?? "location details pending";
  const meeting = input.meetingUrl ?? "meeting link pending";
  return `Attend hybrid: in person at ${location}, or online via ${meeting}`;
};

export const buildReminderPayload = (event: EventDeliveryInput) => {
  const start = new Date(event.startAt).toISOString();

  return {
    channel: "email",
    template: "event_reminder_v1",
    subject: `Reminder: ${event.title}`,
    send_at: start,
    data: {
      title: event.title,
      timezone: event.timezone,
      start_at: start,
      delivery_mode: event.deliveryMode,
      location_text: event.locationText,
      meeting_url: event.meetingUrl,
      how_to_attend: attendanceInstructions({
        deliveryMode: event.deliveryMode,
        locationText: event.locationText,
        meetingUrl: event.meetingUrl,
      }),
    },
  };
};
