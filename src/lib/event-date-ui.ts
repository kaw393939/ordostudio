import { parseISO, getLocalTimezone } from "@/lib/date-time";
import { getLocale } from "@/platform/locale";

export function formatEventPrimaryRange(args: {
  startIso: string;
  endIso: string;
  timezone: string;
}): string {
  const start = parseISO(args.startIso);
  const end = parseISO(args.endIso);

  const dateFormatter = new Intl.DateTimeFormat(getLocale(), {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: args.timezone,
  });

  const timeFormatter = new Intl.DateTimeFormat(getLocale(), {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: args.timezone,
  });

  return `${dateFormatter.format(start)} · ${timeFormatter.format(start)} – ${timeFormatter.format(end)}`;
}

export function formatTimeZoneLabel(args: {
  isoString: string;
  timezone?: string;
}): string {
  const tz = args.timezone ?? getLocalTimezone();
  const date = parseISO(args.isoString);

  const parts = new Intl.DateTimeFormat(getLocale(), {
    timeZone: tz,
    timeZoneName: "longGeneric",
  }).formatToParts(date);

  const tzPart = parts.find((part) => part.type === "timeZoneName")?.value;
  return tzPart && tzPart.trim().length > 0 ? tzPart : tz;
}
