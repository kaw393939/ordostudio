import type { EventListItemViewModel } from "@/lib/view-models/events";
import { getLocale } from "@/platform/locale";

export type DiscoveryView = "list" | "month" | "agenda";

export type EventTimeContext = {
  eventRange: string;
  localRange: string;
  eventTimezone: string;
  localTimezone: string;
};

export type CalendarDayCell = {
  dateKey: string;
  dayOfMonth: number;
  inMonth: boolean;
  items: EventListItemViewModel[];
};

export type CalendarWeek = CalendarDayCell[];

export const isDiscoveryView = (value: string | null): value is DiscoveryView =>
  value === "list" || value === "month" || value === "agenda";

const formatRange = (startAt: string, endAt: string, timeZone: string): string => {
  const dateFormatter = new Intl.DateTimeFormat(getLocale(), {
    month: "short",
    day: "numeric",
    timeZone,
  });
  const timeFormatter = new Intl.DateTimeFormat(getLocale(), {
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  });

  const startDate = new Date(startAt);
  const endDate = new Date(endAt);

  return `${dateFormatter.format(startDate)} · ${timeFormatter.format(startDate)} – ${timeFormatter.format(endDate)}`;
};

export function formatEventTimeContext(event: Pick<EventListItemViewModel, "startAt" | "endAt" | "timezone">): EventTimeContext {
  const localTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  return {
    eventRange: formatRange(event.startAt, event.endAt, event.timezone),
    localRange: formatRange(event.startAt, event.endAt, localTimezone),
    eventTimezone: event.timezone,
    localTimezone,
  };
}

const toDateKey = (value: Date): string => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const toMonthKey = (value: Date): string => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
};

const parseMonthKey = (monthKey: string | null, fallback: Date): Date => {
  if (!monthKey) {
    return new Date(fallback.getFullYear(), fallback.getMonth(), 1);
  }

  const match = /^(\d{4})-(\d{2})$/.exec(monthKey);
  if (!match) {
    return new Date(fallback.getFullYear(), fallback.getMonth(), 1);
  }

  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  if (!Number.isInteger(year) || !Number.isInteger(monthIndex) || monthIndex < 0 || monthIndex > 11) {
    return new Date(fallback.getFullYear(), fallback.getMonth(), 1);
  }

  return new Date(year, monthIndex, 1);
};

const byDateAsc = (items: EventListItemViewModel[]): EventListItemViewModel[] =>
  [...items].sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());

export function toAgendaGroups(items: EventListItemViewModel[]): Array<{ dateKey: string; items: EventListItemViewModel[] }> {
  const groups = new Map<string, EventListItemViewModel[]>();

  for (const item of byDateAsc(items)) {
    const dateKey = toDateKey(new Date(item.startAt));
    const group = groups.get(dateKey) ?? [];
    group.push(item);
    groups.set(dateKey, group);
  }

  return [...groups.entries()].map(([dateKey, groupedItems]) => ({
    dateKey,
    items: groupedItems,
  }));
}

export function toCalendarMonthGrid(
  items: EventListItemViewModel[],
  monthKey: string | null,
): { monthKey: string; monthLabel: string; weeks: CalendarWeek[] } {
  const fallback = items.length > 0 ? new Date(items[0].startAt) : new Date();
  const monthDate = parseMonthKey(monthKey, fallback);

  const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);

  const visibleStart = new Date(monthStart);
  visibleStart.setDate(monthStart.getDate() - monthStart.getDay());

  const visibleEnd = new Date(monthEnd);
  visibleEnd.setDate(monthEnd.getDate() + (6 - monthEnd.getDay()));

  const itemsByDate = new Map<string, EventListItemViewModel[]>();
  for (const item of byDateAsc(items)) {
    const key = toDateKey(new Date(item.startAt));
    const existing = itemsByDate.get(key) ?? [];
    existing.push(item);
    itemsByDate.set(key, existing);
  }

  const weeks: CalendarWeek[] = [];
  const cursor = new Date(visibleStart);

  while (cursor <= visibleEnd) {
    const week: CalendarDayCell[] = [];
    for (let day = 0; day < 7; day += 1) {
      const current = new Date(cursor);
      const key = toDateKey(current);
      week.push({
        dateKey: key,
        dayOfMonth: current.getDate(),
        inMonth: current.getMonth() === monthDate.getMonth(),
        items: itemsByDate.get(key) ?? [],
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
  }

  const monthLabel = new Intl.DateTimeFormat(getLocale(), { month: "long", year: "numeric" }).format(monthDate);

  return {
    monthKey: toMonthKey(monthDate),
    monthLabel,
    weeks,
  };
}

export function shiftMonthKey(currentMonthKey: string, offset: number): string {
  const parsed = parseMonthKey(currentMonthKey, new Date());
  const next = new Date(parsed.getFullYear(), parsed.getMonth() + offset, 1);
  return toMonthKey(next);
}
