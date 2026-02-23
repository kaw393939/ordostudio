import { nowISO, parseISO } from "@/lib/date-time";

export type CalendarLinkInput = {
  title: string;
  startIso: string;
  endIso: string;
  location?: string | null;
  detailsUrl?: string | null;
};

const formatUtcCompact = (iso: string) =>
  iso.replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");

const escapeIcsText = (value: string) => {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
};

export function buildGoogleCalendarUrl(input: CalendarLinkInput): string {
  const start = formatUtcCompact(parseISO(input.startIso).toISOString());
  const end = formatUtcCompact(parseISO(input.endIso).toISOString());
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: input.title,
    dates: `${start}/${end}`,
  });

  if (input.location && input.location.trim().length > 0) {
    params.set("location", input.location.trim());
  }
  if (input.detailsUrl && input.detailsUrl.trim().length > 0) {
    params.set("details", input.detailsUrl.trim());
  }

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function buildIcsContent(input: CalendarLinkInput): string {
  const uid = `${input.detailsUrl ? input.detailsUrl : input.title}@lms-219`;
  const now = formatUtcCompact(nowISO());
  const start = formatUtcCompact(parseISO(input.startIso).toISOString());
  const end = formatUtcCompact(parseISO(input.endIso).toISOString());

  const descriptionParts: string[] = [];
  if (input.detailsUrl) descriptionParts.push(`Event details: ${input.detailsUrl}`);
  const description = descriptionParts.join("\n");

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//LMS 219//Events//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${escapeIcsText(uid)}`,
    `DTSTAMP:${now}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${escapeIcsText(input.title)}`,
  ];

  if (input.location && input.location.trim().length > 0) {
    lines.push(`LOCATION:${escapeIcsText(input.location.trim())}`);
  }
  if (description.length > 0) {
    lines.push(`DESCRIPTION:${escapeIcsText(description)}`);
  }
  if (input.detailsUrl && input.detailsUrl.trim().length > 0) {
    lines.push(`URL:${escapeIcsText(input.detailsUrl.trim())}`);
  }

  lines.push("END:VEVENT", "END:VCALENDAR");
  return lines.join("\r\n");
}
