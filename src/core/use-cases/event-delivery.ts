import { InvalidInputError } from "../domain/errors";

export type DeliveryMode = "ONLINE" | "IN_PERSON" | "HYBRID";

export type DeliveryLogisticsInput = {
  deliveryMode?: string;
  locationText?: string;
  meetingUrl?: string;
};

export type DeliveryLogistics = {
  delivery_mode: DeliveryMode;
  location_text: string | null;
  meeting_url: string | null;
};

const normalizeMode = (value?: string): DeliveryMode => {
  const normalized = value?.trim().toUpperCase();
  if (!normalized) {
    return "ONLINE";
  }

  if (normalized === "ONLINE" || normalized === "IN_PERSON" || normalized === "HYBRID") {
    return normalized;
  }

  throw new InvalidInputError("Delivery mode must be ONLINE, IN_PERSON, or HYBRID.");
};

const normalizeUrl = (value?: string): string | null => {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const parsed = new URL(trimmed);
    if (!parsed.protocol.startsWith("http")) {
      throw new Error("invalid_url");
    }
    return trimmed;
  } catch {
    throw new InvalidInputError("Meeting URL must be a valid http(s) URL.");
  }
};

export const parseDeliveryLogistics = (input: DeliveryLogisticsInput): DeliveryLogistics => {
  const hasExplicitMode = Boolean(input.deliveryMode?.trim());
  const hasLocation = Boolean(input.locationText?.trim());
  const hasMeeting = Boolean(input.meetingUrl?.trim());

  if (!hasExplicitMode && !hasLocation && !hasMeeting) {
    return {
      delivery_mode: "ONLINE",
      location_text: null,
      meeting_url: null,
    };
  }

  const mode = normalizeMode(input.deliveryMode);
  const location = input.locationText?.trim() || null;
  const meetingUrl = normalizeUrl(input.meetingUrl);

  if (mode === "ONLINE" && !meetingUrl) {
    throw new InvalidInputError("Meeting URL is required for ONLINE delivery mode.");
  }

  if (mode === "IN_PERSON" && !location) {
    throw new InvalidInputError("Location is required for IN_PERSON delivery mode.");
  }

  if (mode === "HYBRID") {
    if (!meetingUrl || !location) {
      throw new InvalidInputError("Location and meeting URL are required for HYBRID delivery mode.");
    }
  }

  return {
    delivery_mode: mode,
    location_text: location,
    meeting_url: meetingUrl,
  };
};
