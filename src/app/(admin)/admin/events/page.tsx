"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ProblemDetailsPanel } from "@/components/problem-details";
import { EmptyState } from "@/components/patterns";
import { DateRangePicker, DateTimePicker, type DateRangeValue } from "@/components/forms";
import { PageShell } from "@/components/layout/page-shell";
import { Button, Card } from "@/components/primitives";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toEventCreatePayload } from "@/lib/admin-events-view";
import { formatEventTimeContext, shiftMonthKey, toCalendarMonthGrid } from "@/lib/calendar-date-ui";
import { detectConflicts, type ScheduleConflict, type SchedulableEvent } from "@/lib/admin-scheduling";
import { requestHal, type ProblemDetails } from "@/lib/hal-client";
import {
  adminStatusToApiStatus,
  DEFAULT_ADMIN_LIST_STATE,
  sortEvents,
  type AdminStatusFilter,
  type EventSort,
} from "@/lib/events-discovery-ui";
import { mapEventsToListItems, type EventListItemViewModel, type EventsPayload } from "@/lib/view-models/events";
import { useFeatureFlag } from "@/components/feature-flags-provider";

type RegistrationCountsPayload = {
  items: Array<{ slug: string; count: number }>;
};

type CalendarView = "month" | "week" | "day";

type EventCreateForm = {
  slug: string;
  title: string;
  start: string;
  end: string;
  timezone: string;
  engagementType: "INDIVIDUAL" | "GROUP";
  deliveryMode: "ONLINE" | "IN_PERSON" | "HYBRID";
  locationText: string;
  meetingUrl: string;
  capacity: string;
};

type DragHover = { day: Date; minutes: number };

type DragState = {
  eventId: string;
  durationMs: number;
  hover: DragHover | null;
};

type PendingReschedule = {
  event: EventListItemViewModel;
  nextStartAt: string;
  nextEndAt: string;
  registrations: number;
  conflicts: ScheduleConflict[];
};

type BatchDialog =
  | {
      type: "reschedule";
      offsetMs: number;
      offsetLabel: string;
      conflictsById: Record<string, ScheduleConflict[]>;
      totalRegistrations: number;
    }
  | {
      type: "cancel";
      reason: string;
      totalRegistrations: number;
    }
  | null;

const DEFAULT_CREATE_FORM: EventCreateForm = {
  slug: "",
  title: "",
  start: "",
  end: "",
  timezone: "UTC",
  engagementType: "INDIVIDUAL",
  deliveryMode: "ONLINE",
  locationText: "",
  meetingUrl: "",
  capacity: "",
};

export default function AdminEventsPage() {
  const calendarEnabled = useFeatureFlag("CALENDAR_GRID");
  const [events, setEvents] = useState<EventListItemViewModel[]>([]);
  const [problem, setProblem] = useState<ProblemDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const [queryInput, setQueryInput] = useState(DEFAULT_ADMIN_LIST_STATE.q);
  const [searchQuery, setSearchQuery] = useState(DEFAULT_ADMIN_LIST_STATE.q);
  const [status, setStatus] = useState<AdminStatusFilter>(DEFAULT_ADMIN_LIST_STATE.status);
  const [sort, setSort] = useState<EventSort>(DEFAULT_ADMIN_LIST_STATE.sort);
  const [dateRange, setDateRange] = useState<DateRangeValue>({ from: "", to: "" });

  const [calendarView, setCalendarView] = useState<CalendarView>("month");
  const [monthKey, setMonthKey] = useState<string | null>(null);
  const [previewEvent, setPreviewEvent] = useState<EventListItemViewModel | null>(null);

  const [drag, setDrag] = useState<DragState | null>(null);
  const [pendingReschedule, setPendingReschedule] = useState<PendingReschedule | null>(null);
  const [rescheduling, setRescheduling] = useState(false);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [batchDialog, setBatchDialog] = useState<BatchDialog>(null);
  const [batchBusy, setBatchBusy] = useState(false);
  const [batchOffsetAmount, setBatchOffsetAmount] = useState("1");
  const [batchOffsetUnit, setBatchOffsetUnit] = useState<"days" | "weeks">("weeks");
  const [batchCancelReason, setBatchCancelReason] = useState("");

  const [registrationCountsBySlug, setRegistrationCountsBySlug] = useState<Record<string, number>>({});
  const [form, setForm] = useState(DEFAULT_CREATE_FORM);

  const previewContext = previewEvent ? formatEventTimeContext(previewEvent) : null;
  const monthGrid = useMemo(() => toCalendarMonthGrid(events, monthKey), [events, monthKey]);

  const dayAnchor = useMemo(() => {
    const iso = previewEvent?.startAt ?? events[0]?.startAt ?? new Date().toISOString();
    return new Date(iso);
  }, [events, previewEvent]);

  const dayStartUtc = useMemo(() => {
    return new Date(Date.UTC(dayAnchor.getUTCFullYear(), dayAnchor.getUTCMonth(), dayAnchor.getUTCDate(), 0, 0, 0, 0));
  }, [dayAnchor]);

  const weekStartUtc = useMemo(() => {
    const day = dayAnchor.getUTCDay();
    const start = new Date(Date.UTC(dayAnchor.getUTCFullYear(), dayAnchor.getUTCMonth(), dayAnchor.getUTCDate(), 0, 0, 0, 0));
    start.setUTCDate(start.getUTCDate() - day);
    return start;
  }, [dayAnchor]);

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }).map((_, index) => {
      const date = new Date(weekStartUtc);
      date.setUTCDate(date.getUTCDate() + index);
      return date;
    });
  }, [weekStartUtc]);

  const scheduleEvents = useMemo<SchedulableEvent[]>(() => {
    return events.map((event) => ({
      id: event.id,
      slug: event.slug,
      title: event.title,
      startAt: event.startAt,
      endAt: event.endAt,
      timezone: event.timezone,
      locationText: event.locationText ?? null,
      instructorId: event.instructorId ?? null,
    }));
  }, [events]);

  useEffect(() => {
    setSelectedIds((current) => current.filter((id) => events.some((event) => event.id === id)));
  }, [events]);

  const selectedEvents = useMemo(() => {
    const selected = new Set(selectedIds);
    return events.filter((event) => selected.has(event.id));
  }, [events, selectedIds]);

  const totalSelectedRegistrations = useMemo(() => {
    return selectedEvents.reduce((sum, event) => sum + (registrationCountsBySlug[event.slug] ?? 0), 0);
  }, [registrationCountsBySlug, selectedEvents]);

  const toggleSelected = (eventId: string) => {
    setSelectedIds((current) => {
      const set = new Set(current);
      if (set.has(eventId)) {
        set.delete(eventId);
      } else {
        set.add(eventId);
      }
      return [...set];
    });
  };

  const setAllSelected = (selectAll: boolean) => {
    if (!selectAll) {
      setSelectedIds([]);
      return;
    }
    setSelectedIds(events.map((event) => event.id));
  };

  const exportSelectedCsv = () => {
    if (selectedEvents.length === 0) {
      toast.info("Select one or more events first.");
      return;
    }

    const escape = (value: string) => {
      const normalized = value.replaceAll("\r\n", "\n").replaceAll("\r", "\n");
      return `"${normalized.replaceAll("\"", "\"\"")}"`;
    };

    const header = [
      "slug",
      "title",
      "status",
      "startAt",
      "endAt",
      "timezone",
      "locationText",
      "instructorName",
      "registrations",
    ].join(",");

    const rows = selectedEvents.map((event) => {
      const regs = String(registrationCountsBySlug[event.slug] ?? 0);
      return [
        escape(event.slug),
        escape(event.title),
        escape(event.status),
        escape(event.startAt),
        escape(event.endAt),
        escape(event.timezone),
        escape(event.locationText ?? ""),
        escape(event.instructorName ?? ""),
        regs,
      ].join(",");
    });

    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `events-export-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const computeOffsetMs = (amount: number, unit: "days" | "weeks") => {
    const days = unit === "weeks" ? amount * 7 : amount;
    return days * 24 * 60 * 60 * 1000;
  };

  const computeBatchRescheduleConflicts = (offsetMs: number) => {
    const selected = new Set(selectedIds);
    const simulated: SchedulableEvent[] = scheduleEvents.map((event) => {
      if (!selected.has(event.id)) {
        return event;
      }
      return {
        ...event,
        startAt: new Date(new Date(event.startAt).getTime() + offsetMs).toISOString(),
        endAt: new Date(new Date(event.endAt).getTime() + offsetMs).toISOString(),
      };
    });

    const byId: Record<string, ScheduleConflict[]> = {};
    for (const moving of simulated) {
      if (!selected.has(moving.id)) {
        continue;
      }
      byId[moving.id] = detectConflicts({
        events: simulated,
        moving,
        nextStartAt: moving.startAt,
        nextEndAt: moving.endAt,
      });
    }
    return byId;
  };

  const dragEvent = useMemo(() => {
    if (!drag) {
      return null;
    }
    return events.find((event) => event.id === drag.eventId) ?? null;
  }, [drag, events]);

  const dragEventId = drag?.eventId ?? null;

  useEffect(() => {
    if (!dragEventId) {
      return;
    }

    const onPointerUp = () => {
      setDrag(null);
    };

    window.addEventListener("pointerup", onPointerUp, { once: true });
    return () => {
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [dragEventId]);

  const dragGhost = useMemo(() => {
    if (!drag || !drag.hover || !dragEvent) {
      return null;
    }

    const start = new Date(Date.UTC(drag.hover.day.getUTCFullYear(), drag.hover.day.getUTCMonth(), drag.hover.day.getUTCDate(), 0, 0, 0, 0));
    start.setUTCMinutes(drag.hover.minutes);
    const end = new Date(start.getTime() + drag.durationMs);

    const conflicts = detectConflicts({
      events: scheduleEvents,
      moving: {
        id: dragEvent.id,
        slug: dragEvent.slug,
        title: dragEvent.title,
        startAt: dragEvent.startAt,
        endAt: dragEvent.endAt,
        timezone: dragEvent.timezone,
        locationText: dragEvent.locationText ?? null,
        instructorId: dragEvent.instructorId ?? null,
      },
      nextStartAt: start.toISOString(),
      nextEndAt: end.toISOString(),
    });

    return {
      nextStartAt: start.toISOString(),
      nextEndAt: end.toISOString(),
      conflicts,
    };
  }, [drag, dragEvent, scheduleEvents]);

  const quickCreateAtUtc = (args: { day: Date; minutes: number }) => {
    const start = new Date(Date.UTC(args.day.getUTCFullYear(), args.day.getUTCMonth(), args.day.getUTCDate(), 0, 0, 0, 0));
    start.setUTCMinutes(args.minutes);
    const end = new Date(start.getTime() + 60 * 60 * 1000);

    setForm((prev) => ({
      ...prev,
      start: start.toISOString(),
      end: end.toISOString(),
    }));

    toast.info("Quick create: start/end pre-filled.");
    window.location.hash = "create";
  };

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setProblem(null);

      const params = new URLSearchParams();
      const trimmed = searchQuery.trim();
      if (trimmed.length > 0) {
        params.set("q", trimmed);
      }

      const apiStatus = adminStatusToApiStatus(status);
      if (apiStatus) {
        params.set("status", apiStatus);
      }

      if (dateRange.from) {
        params.set("from", dateRange.from);
      }

      if (dateRange.to) {
        params.set("to", dateRange.to);
      }

      params.set("limit", "200");
      params.set("offset", "0");

      const result = await requestHal<EventsPayload>(`/api/v1/events?${params.toString()}`);
      if (cancelled) {
        return;
      }

      if (!result.ok) {
        setEvents([]);
        setPreviewEvent(null);
        setRegistrationCountsBySlug({});
        setProblem(result.problem);
        setLoading(false);
        return;
      }

      const nextEvents = sortEvents(mapEventsToListItems(result.data), sort);
      setEvents(nextEvents);

      setPreviewEvent((current) => {
        if (current && nextEvents.some((item) => item.id === current.id)) {
          return current;
        }
        return nextEvents[0] ?? null;
      });

      if (nextEvents.length > 0) {
        const first = new Date(nextEvents[0].startAt);
        const firstMonthKey = `${first.getFullYear()}-${String(first.getMonth() + 1).padStart(2, "0")}`;
        setMonthKey((current) => current ?? firstMonthKey);
      }

      if (nextEvents.length === 0) {
        setRegistrationCountsBySlug({});
        setLoading(false);
        return;
      }

      const slugs = nextEvents.map((event) => event.slug);
      const counts = await requestHal<RegistrationCountsPayload>("/api/v1/admin/events/registration-counts", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ slugs }),
      });

      if (!cancelled && counts.ok) {
        const next: Record<string, number> = {};
        for (const item of counts.data.items ?? []) {
          next[item.slug] = item.count;
        }
        setRegistrationCountsBySlug(next);
      } else if (!cancelled) {
        setRegistrationCountsBySlug({});
      }

      setLoading(false);
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [searchQuery, status, sort, refreshKey, dateRange.from, dateRange.to]);

  const onCreate = async () => {
    setCreating(true);
    setProblem(null);

    const result = await requestHal<unknown>("/api/v1/events", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(toEventCreatePayload(form)),
    });

    if (!result.ok) {
      setProblem(result.problem);
      setCreating(false);
      return;
    }

    toast.success("Event created.");
    setForm(DEFAULT_CREATE_FORM);
    setRefreshKey((current) => current + 1);
    setCreating(false);
  };

  const confirmReschedule = async (pending: PendingReschedule) => {
    const prevStartAt = pending.event.startAt;
    const prevEndAt = pending.event.endAt;

    setRescheduling(true);
    setPendingReschedule(null);

    setEvents((current) =>
      current.map((event) =>
        event.id === pending.event.id
          ? {
              ...event,
              startAt: pending.nextStartAt,
              endAt: pending.nextEndAt,
            }
          : event,
      ),
    );

    setPreviewEvent((current) => {
      if (!current) {
        return current;
      }
      if (current.id !== pending.event.id) {
        return current;
      }
      return {
        ...current,
        startAt: pending.nextStartAt,
        endAt: pending.nextEndAt,
      };
    });

    const result = await requestHal<unknown>(`/api/v1/events/${pending.event.slug}`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        start: pending.nextStartAt,
        end: pending.nextEndAt,
      }),
    });

    if (!result.ok) {
      setEvents((current) =>
        current.map((event) =>
          event.id === pending.event.id
            ? {
                ...event,
                startAt: prevStartAt,
                endAt: prevEndAt,
              }
            : event,
        ),
      );

      setPreviewEvent((current) => {
        if (!current) {
          return current;
        }
        if (current.id !== pending.event.id) {
          return current;
        }
        return {
          ...current,
          startAt: prevStartAt,
          endAt: prevEndAt,
        };
      });

      toast.error("Could not reschedule event. Changes were rolled back.");
      setRescheduling(false);
      return;
    }

    toast.success("Event rescheduled.");
    setRefreshKey((current) => current + 1);
    setRescheduling(false);
  };

  const confirmBatchReschedule = async (payload: Extract<BatchDialog, { type: "reschedule" }>) => {
    if (selectedEvents.length === 0) {
      setBatchDialog(null);
      return;
    }

    setBatchBusy(true);
    setBatchDialog(null);

    const selected = new Set(selectedIds);
    const previousTimes = new Map<string, { startAt: string; endAt: string }>();
    for (const event of events) {
      if (selected.has(event.id)) {
        previousTimes.set(event.id, { startAt: event.startAt, endAt: event.endAt });
      }
    }

    setEvents((current) =>
      current.map((event) => {
        if (!selected.has(event.id)) {
          return event;
        }
        return {
          ...event,
          startAt: new Date(new Date(event.startAt).getTime() + payload.offsetMs).toISOString(),
          endAt: new Date(new Date(event.endAt).getTime() + payload.offsetMs).toISOString(),
        };
      }),
    );

    const results = await Promise.all(
      selectedEvents.map(async (event) => {
        const nextStartAt = new Date(new Date(event.startAt).getTime() + payload.offsetMs).toISOString();
        const nextEndAt = new Date(new Date(event.endAt).getTime() + payload.offsetMs).toISOString();
        const result = await requestHal<unknown>(`/api/v1/events/${event.slug}`, {
          method: "PATCH",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({ start: nextStartAt, end: nextEndAt }),
        });
        return { eventId: event.id, ok: result.ok };
      }),
    );

    const failed = results.filter((item) => !item.ok);
    if (failed.length > 0) {
      setEvents((current) =>
        current.map((event) => {
          const previous = previousTimes.get(event.id);
          if (!previous) {
            return event;
          }
          return { ...event, startAt: previous.startAt, endAt: previous.endAt };
        }),
      );
      toast.error(`Batch reschedule failed for ${failed.length} event(s). Changes were rolled back.`);
      setBatchBusy(false);
      return;
    }

    toast.success(`Rescheduled ${selectedEvents.length} event(s).`);
    setRefreshKey((current) => current + 1);
    setBatchBusy(false);
  };

  const confirmBatchCancel = async (payload: Extract<BatchDialog, { type: "cancel" }>) => {
    if (selectedEvents.length === 0) {
      setBatchDialog(null);
      return;
    }
    if (payload.reason.trim().length === 0) {
      toast.error("Cancellation reason is required.");
      return;
    }

    setBatchBusy(true);
    setBatchDialog(null);

    const selected = new Set(selectedIds);
    const previousStatuses = new Map<string, { status: string; statusLabel: string }>();
    for (const event of events) {
      if (selected.has(event.id)) {
        previousStatuses.set(event.id, { status: event.status, statusLabel: event.statusLabel });
      }
    }

    setEvents((current) =>
      current.map((event) => {
        if (!selected.has(event.id)) {
          return event;
        }
        return { ...event, status: "CANCELLED", statusLabel: "Cancelled" };
      }),
    );

    const results = await Promise.all(
      selectedEvents.map(async (event) => {
        const result = await requestHal<unknown>(`/api/v1/events/${event.slug}/cancel`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({ reason: payload.reason.trim() }),
        });
        return { eventId: event.id, ok: result.ok };
      }),
    );

    const failed = results.filter((item) => !item.ok);
    if (failed.length > 0) {
      setEvents((current) =>
        current.map((event) => {
          const previous = previousStatuses.get(event.id);
          if (!previous) {
            return event;
          }
          return { ...event, status: previous.status, statusLabel: previous.statusLabel };
        }),
      );
      toast.error(`Batch cancel failed for ${failed.length} event(s). Changes were rolled back.`);
      setBatchBusy(false);
      return;
    }

    toast.success(`Cancelled ${selectedEvents.length} event(s).`);
    setRefreshKey((current) => current + 1);
    setBatchCancelReason("");
    setBatchBusy(false);
  };

  return (
    <PageShell
      title="Events"
      subtitle="Manage and schedule events."
      breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Events" }]}
    >
      <Card className="p-4" id="create">
        <h2 className="type-title">Create event</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="event-slug">Slug</Label>
            <Input
              id="event-slug"
              placeholder="e.g., spring-workshop-2025"
              value={form.slug}
              onChange={(event) => setForm((prev) => ({ ...prev, slug: event.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="event-title">Title</Label>
            <Input
              id="event-title"
              placeholder="e.g., Spring Leadership Workshop"
              value={form.title}
              onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
            />
          </div>
          <DateTimePicker label="Start" value={form.start} onChange={(value) => setForm((prev) => ({ ...prev, start: value }))} />
          <DateTimePicker label="End" value={form.end} onChange={(value) => setForm((prev) => ({ ...prev, end: value }))} />
          <div className="space-y-1.5">
            <Label htmlFor="event-timezone">Timezone</Label>
            <Input
              id="event-timezone"
              placeholder="e.g., America/New_York"
              value={form.timezone}
              onChange={(event) => setForm((prev) => ({ ...prev, timezone: event.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="event-engagement">Engagement type</Label>
            <Select
              value={form.engagementType}
              onValueChange={(value) => setForm((prev) => ({ ...prev, engagementType: value as "INDIVIDUAL" | "GROUP" }))}
            >
              <SelectTrigger id="event-engagement" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="INDIVIDUAL">Individual</SelectItem>
                <SelectItem value="GROUP">Group</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="event-delivery">Delivery mode</Label>
            <Select
              value={form.deliveryMode}
              onValueChange={(value) => setForm((prev) => ({ ...prev, deliveryMode: value as "ONLINE" | "IN_PERSON" | "HYBRID" }))}
            >
              <SelectTrigger id="event-delivery" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ONLINE">Online</SelectItem>
                <SelectItem value="IN_PERSON">In person</SelectItem>
                <SelectItem value="HYBRID">Hybrid</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="event-location">Location</Label>
            <Input
              id="event-location"
              placeholder="Required for in-person/hybrid"
              value={form.locationText}
              onChange={(event) => setForm((prev) => ({ ...prev, locationText: event.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="event-meeting-url">Meeting URL</Label>
            <Input
              id="event-meeting-url"
              placeholder="Required for online/hybrid"
              value={form.meetingUrl}
              onChange={(event) => setForm((prev) => ({ ...prev, meetingUrl: event.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="event-capacity">
              Capacity <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Input
              id="event-capacity"
              placeholder="e.g., 30"
              value={form.capacity}
              onChange={(event) => setForm((prev) => ({ ...prev, capacity: event.target.value }))}
            />
          </div>
        </div>

        <Button type="button" onClick={() => void onCreate()} disabled={creating} className="mt-3" intent="primary">
          {creating ? "Creating..." : "Create event"}
        </Button>
      </Card>

      {calendarEnabled ? (
        <Card className="mt-4 p-4">
          <h2 className="type-title">Calendar</h2>
          <p className="mt-1 type-body-sm text-text-secondary">Month, week, and day scheduling views.</p>

        <div className="mt-3 flex items-center justify-between gap-3">
          <Tabs value={calendarView} onValueChange={(value) => setCalendarView(value as CalendarView)}>
            <TabsList variant="line">
              <TabsTrigger value="month">Month</TabsTrigger>
              <TabsTrigger value="week">Week</TabsTrigger>
              <TabsTrigger value="day">Day</TabsTrigger>
            </TabsList>
          </Tabs>

          <Button intent="secondary" onClick={() => window.print()}>
            Print Schedule
          </Button>
        </div>

        {loading ? (
          <div className="mt-4 grid grid-cols-7 gap-2">
            {Array.from({ length: 14 }).map((_, index) => (
              <Card key={`cal-skel-${index}`} className="min-h-24 p-2">
                <Skeleton className="h-3 w-8" />
                <Skeleton className="mt-2 h-4 w-full" />
              </Card>
            ))}
          </div>
        ) : null}

        {!loading && calendarView === "month" ? (
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <Button intent="secondary" onClick={() => setMonthKey(shiftMonthKey(monthGrid.monthKey, -1))}>
                Previous month
              </Button>
              <p className="type-title">{monthGrid.monthLabel}</p>
              <Button intent="secondary" onClick={() => setMonthKey(shiftMonthKey(monthGrid.monthKey, 1))}>
                Next month
              </Button>
            </div>

            <div className="grid grid-cols-7 gap-2">
              {monthGrid.weeks.flat().map((day) => (
                <Card
                  key={day.dateKey}
                  className={`min-h-24 p-2 ${day.inMonth ? "" : "opacity-60"}`}
                  onClick={() => {
                    if (day.items.length === 0) {
                      const date = new Date(`${day.dateKey}T00:00:00.000Z`);
                      quickCreateAtUtc({ day: date, minutes: 12 * 60 });
                    }
                  }}
                >
                  <p className="type-meta text-text-muted">{day.dayOfMonth}</p>
                  <div className="mt-1 space-y-1">
                    {day.items.slice(0, 3).map((eventItem) => {
                      const start = new Date(eventItem.startAt);
                      const time = `${String(start.getUTCHours()).padStart(2, "0")}:${String(start.getUTCMinutes()).padStart(2, "0")}`;
                      return (
                        <button
                          key={eventItem.id}
                          type="button"
                          className="block w-full rounded-sm border border-border-default bg-action-secondary px-2 py-1 text-left type-meta text-text-primary"
                          onClick={(event) => {
                            event.stopPropagation();
                            setPreviewEvent(eventItem);
                          }}
                        >
                          <span className="mr-2 text-text-secondary">{time}</span>
                          <span>{eventItem.title}</span>
                        </button>
                      );
                    })}
                    {day.items.length > 3 ? <p className="type-meta text-text-muted">+{day.items.length - 3} more</p> : null}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ) : null}

        {!loading && calendarView !== "month" ? (
          <div className="mt-4 overflow-x-auto">
            <div
              className="grid min-w-230 gap-px rounded-sm border border-border-default bg-border-subtle"
              style={{
                gridTemplateColumns:
                  calendarView === "week" ? "4.5rem repeat(7, minmax(0, 1fr))" : "4.5rem minmax(0, 1fr)",
                gridTemplateRows: "2.5rem repeat(48, 1.25rem)",
              }}
            >
              <div className="bg-surface" />
              {calendarView === "week" ? (
                weekDays.map((day) => (
                  <div key={day.toISOString()} className="bg-surface p-2 type-meta text-text-secondary">
                    {day.toISOString().slice(0, 10)}
                  </div>
                ))
              ) : (
                <div className="bg-surface p-2 type-meta text-text-secondary">{dayStartUtc.toISOString().slice(0, 10)}</div>
              )}

              {Array.from({ length: 48 }).map((_, rowIndex) => {
                const minutes = rowIndex * 30;
                const label = minutes % 60 === 0 ? `${String(minutes / 60).padStart(2, "0")}:00` : "";
                const days = calendarView === "week" ? weekDays : [dayStartUtc];

                return (
                  <div key={`row-${rowIndex}`} className="contents">
                    <div className="bg-surface px-2 py-0.5 type-meta text-text-muted">{label}</div>
                    {days.map((day) => (
                      <button
                        key={`${day.toISOString()}-${rowIndex}`}
                        type="button"
                        className="bg-surface hover:bg-action-secondary"
                        aria-label={`Create at ${day.toISOString().slice(0, 10)} ${minutes} minutes`}
                        onPointerEnter={() => {
                          if (!drag) {
                            return;
                          }
                          setDrag((current) => (current ? { ...current, hover: { day, minutes } } : current));
                        }}
                        onPointerUp={(event) => {
                          if (!drag) {
                            return;
                          }
                          event.preventDefault();
                          event.stopPropagation();

                          const moving = events.find((item) => item.id === drag.eventId);
                          if (!moving) {
                            setDrag(null);
                            return;
                          }

                          const nextStart = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), 0, 0, 0, 0));
                          nextStart.setUTCMinutes(minutes);
                          const nextEnd = new Date(nextStart.getTime() + drag.durationMs);

                          const conflicts = detectConflicts({
                            events: scheduleEvents,
                            moving: {
                              id: moving.id,
                              slug: moving.slug,
                              title: moving.title,
                              startAt: moving.startAt,
                              endAt: moving.endAt,
                              timezone: moving.timezone,
                              locationText: moving.locationText ?? null,
                              instructorId: moving.instructorId ?? null,
                            },
                            nextStartAt: nextStart.toISOString(),
                            nextEndAt: nextEnd.toISOString(),
                          });

                          setPendingReschedule({
                            event: moving,
                            nextStartAt: nextStart.toISOString(),
                            nextEndAt: nextEnd.toISOString(),
                            registrations: registrationCountsBySlug[moving.slug] ?? 0,
                            conflicts,
                          });
                          setDrag(null);
                        }}
                        onClick={() => {
                          if (drag) {
                            return;
                          }
                          quickCreateAtUtc({ day, minutes });
                        }}
                      />
                    ))}
                  </div>
                );
              })}

              {events
                .filter((event) => {
                  const start = new Date(event.startAt);

                  if (calendarView === "week") {
                    return start >= weekStartUtc && start < new Date(weekStartUtc.getTime() + 7 * 24 * 60 * 60 * 1000);
                  }

                  return start >= dayStartUtc && start < new Date(dayStartUtc.getTime() + 24 * 60 * 60 * 1000);
                })
                .map((event) => {
                  const start = new Date(event.startAt);
                  const dayIndex =
                    calendarView === "week"
                      ? Math.floor(
                          (Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()) - weekStartUtc.getTime()) /
                            (24 * 60 * 60 * 1000),
                        )
                      : 0;

                  const minutes = start.getUTCHours() * 60 + start.getUTCMinutes();
                  const rowStart = 2 + Math.floor(minutes / 30);
                  const durationMinutes = Math.max(
                    30,
                    Math.round((new Date(event.endAt).getTime() - new Date(event.startAt).getTime()) / (60 * 1000)),
                  );
                  const rowSpan = Math.max(1, Math.ceil(durationMinutes / 30));
                  const columnStart = calendarView === "week" ? 2 + dayIndex : 2;

                  const time = `${String(start.getUTCHours()).padStart(2, "0")}:${String(start.getUTCMinutes()).padStart(2, "0")}`;

                  return (
                    <button
                      key={`block-${event.id}`}
                      type="button"
                      className={`m-1 rounded-sm border border-border-default bg-action-secondary px-2 py-1 text-left type-meta text-text-primary ${
                        drag?.eventId === event.id ? "opacity-40" : ""
                      }`}
                      style={{
                        gridColumnStart: columnStart,
                        gridRowStart: rowStart,
                        gridRowEnd: rowStart + rowSpan,
                      }}
                      onPointerDown={(pointerEvent) => {
                        pointerEvent.preventDefault();
                        const durationMs = new Date(event.endAt).getTime() - new Date(event.startAt).getTime();
                        setDrag({
                          eventId: event.id,
                          durationMs: Number.isFinite(durationMs) && durationMs > 0 ? durationMs : 60 * 60 * 1000,
                          hover: null,
                        });
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (e.shiftKey) {
                          toggleSelected(event.id);
                          return;
                        }
                        setPreviewEvent(event);
                      }}
                      title={event.locationText ? `Location: ${event.locationText}` : undefined}
                    >
                      <span className="mr-2 text-text-secondary">{time}</span>
                      <span>{event.title}</span>
                    </button>
                  );
                })}

              {drag && dragEvent && dragGhost ? (() => {
                const start = new Date(dragGhost.nextStartAt);
                const minutes = start.getUTCHours() * 60 + start.getUTCMinutes();
                const rowStart = 2 + Math.floor(minutes / 30);
                const rowSpan = Math.max(1, Math.ceil(drag.durationMs / (30 * 60 * 1000)));

                const dayIndex =
                  calendarView === "week"
                    ? Math.floor(
                        (Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()) - weekStartUtc.getTime()) /
                          (24 * 60 * 60 * 1000),
                      )
                    : 0;

                const columnStart = calendarView === "week" ? 2 + dayIndex : 2;
                const conflictTitle =
                  dragGhost.conflicts.length > 0
                    ? `Conflicts: ${dragGhost.conflicts
                        .map((conflict) =>
                          conflict.type === "location"
                            ? `location with ${conflict.with.title}`
                            : `instructor with ${conflict.with.title}`,
                        )
                        .join(", ")}`
                    : undefined;

                return (
                  <div
                    className={`pointer-events-none m-1 rounded-sm border px-2 py-1 text-left type-meta text-text-primary opacity-70 ${
                      dragGhost.conflicts.length > 0 ? "border-state-warning" : "border-border-default"
                    } bg-action-secondary`}
                    style={{
                      gridColumnStart: columnStart,
                      gridRowStart: rowStart,
                      gridRowEnd: rowStart + rowSpan,
                    }}
                    title={conflictTitle}
                  >
                    <span className="mr-2 text-text-secondary">Drag</span>
                    <span>{dragEvent.title}</span>
                  </div>
                );
              })() : null}
            </div>
          </div>
        ) : null}

        <style jsx global>{`
          @media print {
            header,
            nav,
            button,
            a {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            [aria-label='Admin sidebar'] {
              display: none !important;
            }
          }
        `}</style>
        </Card>
      ) : null}

      <Card className="mt-4 p-4">
        <h2 className="type-title">Find events</h2>
        <form
          className="mt-3 flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            setSearchQuery(queryInput);
          }}
        >
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="event-search">Search</Label>
            <Input
              id="event-search"
              value={queryInput}
              onChange={(event) => setQueryInput(event.target.value)}
              placeholder="Search title or slug"
            />
          </div>
          <Button type="submit" intent="primary">
            Search
          </Button>
        </form>

        <div className="mt-3 flex flex-wrap gap-2">
          {([
            { label: "All", value: "all" },
            { label: "Draft", value: "DRAFT" },
            { label: "Published", value: "PUBLISHED" },
            { label: "Cancelled", value: "CANCELLED" },
          ] as const).map((tab) => (
            <Button key={tab.value} intent={status === tab.value ? "primary" : "secondary"} onClick={() => setStatus(tab.value)}>
              {tab.label}
            </Button>
          ))}

          <div className="ml-auto flex items-center gap-2">
            <Label htmlFor="event-sort">Sort</Label>
            <Select value={sort} onValueChange={(value) => setSort(value as EventSort)}>
              <SelectTrigger id="event-sort">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date-asc">Date (earliest first)</SelectItem>
                <SelectItem value="date-desc">Date (latest first)</SelectItem>
                <SelectItem value="status">Status</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <DateRangePicker label="Date range" value={dateRange} onChange={(range) => setDateRange(range)} presets />
          <div className="flex items-end">
            <Button intent="secondary" onClick={() => setDateRange({ from: "", to: "" })}>
              Clear date range
            </Button>
          </div>
        </div>
      </Card>

      {problem ? (
        <div className="mt-4">
          <ProblemDetailsPanel problem={problem} />
        </div>
      ) : null}

      <Card className="mt-4 p-4">
        <h2 className="type-title">Events ({events.length})</h2>

        {selectedIds.length > 0 ? (
          <Card className="mt-3 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <p className="type-label text-text-primary">Selected: {selectedIds.length}</p>
              <p className="type-meta text-text-secondary">Registrations impacted: {totalSelectedRegistrations}</p>

              <div className="ml-auto flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="batch-offset" className="type-meta text-text-secondary">
                    Move by
                  </Label>
                  <Input
                    id="batch-offset"
                    value={batchOffsetAmount}
                    onChange={(event) => setBatchOffsetAmount(event.target.value)}
                    className="w-20"
                    inputMode="numeric"
                  />
                  <Select value={batchOffsetUnit} onValueChange={(value) => setBatchOffsetUnit(value as "days" | "weeks")}>
                    <SelectTrigger className="w-34">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="days">days</SelectItem>
                      <SelectItem value="weeks">weeks</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  intent="primary"
                  disabled={batchBusy}
                  onClick={() => {
                    const parsed = Number(batchOffsetAmount);
                    if (!Number.isFinite(parsed) || parsed === 0) {
                      toast.error("Enter an offset amount (non-zero). ");
                      return;
                    }
                    const offsetMs = computeOffsetMs(Math.trunc(parsed), batchOffsetUnit);
                    const offsetLabel = `${Math.trunc(parsed)} ${batchOffsetUnit}`;
                    const conflictsById = computeBatchRescheduleConflicts(offsetMs);
                    setBatchDialog({
                      type: "reschedule",
                      offsetMs,
                      offsetLabel,
                      conflictsById,
                      totalRegistrations: totalSelectedRegistrations,
                    });
                  }}
                >
                  Batch reschedule
                </Button>

                <Button
                  intent="secondary"
                  disabled={batchBusy}
                  onClick={() => {
                    exportSelectedCsv();
                  }}
                >
                  Export CSV
                </Button>

                <Button
                  intent="danger"
                  disabled={batchBusy}
                  onClick={() => {
                    setBatchDialog({
                      type: "cancel",
                      reason: batchCancelReason,
                      totalRegistrations: totalSelectedRegistrations,
                    });
                  }}
                >
                  Batch cancel
                </Button>

                <Button intent="ghost" disabled={batchBusy} onClick={() => setSelectedIds([])}>
                  Clear selection
                </Button>
              </div>
            </div>
          </Card>
        ) : null}

        {loading ? (
          <div className="mt-3 space-y-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <Card key={`events-skel-${index}`} className="p-3">
                <Skeleton className="h-4 w-2/5" />
                <Skeleton className="mt-2 h-4 w-3/5" />
              </Card>
            ))}
          </div>
        ) : events.length > 0 ? (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-180 text-left type-body-sm">
              <thead>
                <tr className="border-b border-border-default">
                  <th className="py-2 pr-3">
                    <input
                      aria-label="Select all events"
                      type="checkbox"
                      checked={selectedIds.length > 0 && selectedIds.length === events.length}
                      onChange={(event) => setAllSelected(event.target.checked)}
                    />
                  </th>
                  <th className="py-2 pr-3 sticky left-0 bg-surface">Title</th>
                  <th className="py-2 pr-3">Date</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Registrations</th>
                  <th className="py-2 pr-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => {
                  const context = formatEventTimeContext(event);
                  const regCount = registrationCountsBySlug[event.slug] ?? 0;
                  const checked = selectedIds.includes(event.id);
                  return (
                    <tr key={event.id} className="border-b border-border-subtle align-top">
                      <td className="py-2 pr-3">
                        <input
                          aria-label={`Select ${event.title}`}
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleSelected(event.id)}
                        />
                      </td>
                      <td className="py-2 pr-3 sticky left-0 bg-surface">
                        <p className="type-label text-text-primary">{event.title}</p>
                        <p className="type-meta text-text-muted">{event.slug}</p>
                      </td>
                      <td className="py-2 pr-3">
                        <p className="type-meta text-text-secondary">{context.eventRange}</p>
                        <p className="type-meta text-text-muted">{context.eventTimezone}</p>
                      </td>
                      <td className="py-2 pr-3">
                        <span className="rounded-sm border border-border-default px-2 py-1 type-meta text-text-secondary">
                          {event.statusLabel}
                        </span>
                      </td>
                      <td className="py-2 pr-3">
                        <span className="type-meta text-text-secondary">{regCount}</span>
                      </td>
                      <td className="py-2 pr-3">
                        <div className="flex flex-wrap gap-2">
                          <Button intent="secondary" onClick={() => setPreviewEvent(event)}>
                            Preview
                          </Button>
                          <Link className="type-label underline" href={`/admin/events/${event.slug}`} prefetch>
                            Manage
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="No events match your filters"
            description="Adjust search, status, sort, or date range and try again."
            action={
              <Button
                intent="secondary"
                onClick={() => {
                  setQueryInput("");
                  setSearchQuery("");
                  setStatus(DEFAULT_ADMIN_LIST_STATE.status);
                  setSort(DEFAULT_ADMIN_LIST_STATE.sort);
                  setDateRange({ from: "", to: "" });
                }}
              >
                Clear filters
              </Button>
            }
          />
        )}

        {previewEvent && previewContext ? (
          <Card className="mt-4 p-4">
            <h3 className="type-title">Quick preview</h3>
            <p className="mt-2 type-label">{previewEvent.title}</p>
            <p className="type-meta text-text-muted">
              {previewContext.eventRange} ({previewContext.eventTimezone})
            </p>
            <p className="type-meta text-text-muted">
              Local: {previewContext.localRange} ({previewContext.localTimezone})
            </p>
            <div className="mt-2">
              <Link className="type-label underline" href={`/admin/events/${previewEvent.slug}`} prefetch>
                Open manage view
              </Link>
            </div>
          </Card>
        ) : null}
      </Card>

      <AlertDialog
        open={pendingReschedule !== null}
        onOpenChange={(open) => {
          if (!open && !rescheduling) {
            setPendingReschedule(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm reschedule</AlertDialogTitle>
            <AlertDialogDescription>Review the before/after details before applying the change.</AlertDialogDescription>
          </AlertDialogHeader>

          {pendingReschedule ? (
            <div className="space-y-3">
              <div className="space-y-1">
                <p className="type-label text-text-primary">{pendingReschedule.event.title}</p>
                <p className="type-meta text-text-secondary">Registrations impacted: {pendingReschedule.registrations}</p>
              </div>

              <div className="space-y-1">
                <p className="type-meta text-text-muted">Before</p>
                <p className="type-meta text-text-secondary">{formatEventTimeContext(pendingReschedule.event).eventRange}</p>
              </div>

              <div className="space-y-1">
                <p className="type-meta text-text-muted">After</p>
                <p className="type-meta text-text-secondary">
                  {
                    formatEventTimeContext({
                      startAt: pendingReschedule.nextStartAt,
                      endAt: pendingReschedule.nextEndAt,
                      timezone: pendingReschedule.event.timezone,
                    }).eventRange
                  }
                </p>
              </div>

              {pendingReschedule.conflicts.length > 0 ? (
                <div className="rounded-sm border border-state-warning bg-surface p-3">
                  <p className="type-label text-text-primary">Potential conflicts</p>
                  <p className="mt-1 type-meta text-text-secondary">Consider adjusting time, room, or instructor.</p>
                  <ul className="mt-2 space-y-1">
                    {pendingReschedule.conflicts.slice(0, 3).map((conflict) => (
                      <li key={`${conflict.type}-${conflict.with.id}`} className="type-meta text-text-secondary">
                        {conflict.type === "location" ? "Location" : "Instructor"} conflict with{" "}
                        <Link className="underline" href={`/admin/events/${conflict.with.slug}`} prefetch>
                          {conflict.with.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={rescheduling}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={rescheduling || pendingReschedule === null}
              onClick={() => {
                if (pendingReschedule) {
                  void confirmReschedule(pendingReschedule);
                }
              }}
            >
              {rescheduling ? "Rescheduling..." : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={batchDialog !== null}
        onOpenChange={(open) => {
          if (!open && !batchBusy) {
            setBatchDialog(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {batchDialog?.type === "cancel" ? "Confirm batch cancel" : "Confirm batch reschedule"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {batchDialog?.type === "cancel"
                ? "Cancelling events will prevent future registrations and notify via your usual comms process."
                : "Review the offset and any potential conflicts before applying the change."}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {batchDialog?.type === "reschedule" ? (
            <div className="space-y-3">
              <p className="type-meta text-text-secondary">
                Events: {selectedIds.length} · Offset: {batchDialog.offsetLabel} · Registrations impacted: {batchDialog.totalRegistrations}
              </p>

              {(() => {
                const conflicts = Object.entries(batchDialog.conflictsById)
                  .map(([eventId, items]) => ({ eventId, count: items.length }))
                  .filter((item) => item.count > 0);

                if (conflicts.length === 0) {
                  return null;
                }

                return (
                  <div className="rounded-sm border border-state-warning bg-surface p-3">
                    <p className="type-label text-text-primary">Potential conflicts detected</p>
                    <p className="mt-1 type-meta text-text-secondary">
                      {conflicts.length} of {selectedIds.length} selected event(s) have conflicts after the move.
                    </p>
                  </div>
                );
              })()}
            </div>
          ) : null}

          {batchDialog?.type === "cancel" ? (
            <div className="space-y-3">
              <p className="type-meta text-text-secondary">
                Events: {selectedIds.length} · Registrations impacted: {batchDialog.totalRegistrations}
              </p>
              <div className="space-y-1.5">
                <Label htmlFor="batch-cancel-reason">Reason (required)</Label>
                <Input
                  id="batch-cancel-reason"
                  value={batchCancelReason}
                  onChange={(event) => setBatchCancelReason(event.target.value)}
                  placeholder="e.g., Instructor unavailable"
                />
              </div>
            </div>
          ) : null}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={batchBusy}>Back</AlertDialogCancel>
            <AlertDialogAction
              disabled={batchBusy || batchDialog === null}
              onClick={() => {
                if (!batchDialog) {
                  return;
                }
                if (batchDialog.type === "reschedule") {
                  void confirmBatchReschedule(batchDialog);
                } else {
                  void confirmBatchCancel({
                    ...batchDialog,
                    reason: batchCancelReason,
                  });
                }
              }}
            >
              {batchBusy ? "Working..." : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageShell>
  );

}
