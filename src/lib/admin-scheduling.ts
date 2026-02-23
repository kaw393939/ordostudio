import { parseISO } from "@/lib/date-time";

export type SchedulableEvent = {
  id: string;
  slug: string;
  title: string;
  startAt: string;
  endAt: string;
  timezone: string;
  locationText?: string | null;
  instructorId?: string | null;
};

export type ScheduleConflict =
  | {
      type: "location";
      location: string;
      with: Pick<SchedulableEvent, "id" | "slug" | "title" | "startAt" | "endAt">;
    }
  | {
      type: "instructor";
      instructorId: string;
      with: Pick<SchedulableEvent, "id" | "slug" | "title" | "startAt" | "endAt">;
    };

export const addDaysIso = (iso: string, days: number): string => {
  const date = parseISO(iso);
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
};

export const addMsIso = (iso: string, deltaMs: number): string => {
  const date = parseISO(iso);
  return new Date(date.getTime() + deltaMs).toISOString();
};

export const minutesFromMidnightUtc = (iso: string): number => {
  const date = parseISO(iso);
  return date.getUTCHours() * 60 + date.getUTCMinutes();
};

export const overlaps = (aStart: string, aEnd: string, bStart: string, bEnd: string): boolean => {
  const a0 = parseISO(aStart).getTime();
  const a1 = parseISO(aEnd).getTime();
  const b0 = parseISO(bStart).getTime();
  const b1 = parseISO(bEnd).getTime();
  return a0 < b1 && b0 < a1;
};

export const detectConflicts = (args: {
  events: readonly SchedulableEvent[];
  moving: SchedulableEvent;
  nextStartAt: string;
  nextEndAt: string;
}): ScheduleConflict[] => {
  const movingLocation = (args.moving.locationText ?? "").trim();
  const movingInstructorId = (args.moving.instructorId ?? "").trim();

  const conflicts: ScheduleConflict[] = [];

  for (const other of args.events) {
    if (other.id === args.moving.id) {
      continue;
    }

    if (!overlaps(args.nextStartAt, args.nextEndAt, other.startAt, other.endAt)) {
      continue;
    }

    const otherLocation = (other.locationText ?? "").trim();
    if (movingLocation && otherLocation && movingLocation === otherLocation) {
      conflicts.push({
        type: "location",
        location: movingLocation,
        with: {
          id: other.id,
          slug: other.slug,
          title: other.title,
          startAt: other.startAt,
          endAt: other.endAt,
        },
      });
    }

    const otherInstructorId = (other.instructorId ?? "").trim();
    if (movingInstructorId && otherInstructorId && movingInstructorId === otherInstructorId) {
      conflicts.push({
        type: "instructor",
        instructorId: movingInstructorId,
        with: {
          id: other.id,
          slug: other.slug,
          title: other.title,
          startAt: other.startAt,
          endAt: other.endAt,
        },
      });
    }
  }

  return conflicts;
};

export const roundToStepMinutes = (minutes: number, step: number): number => {
  if (step <= 0) {
    return minutes;
  }
  return Math.round(minutes / step) * step;
};
