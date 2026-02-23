"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ProblemDetailsPanel } from "@/components/problem-details";
import { EmptyState, ErrorState, LoadingState } from "@/components/patterns";
import { Button, Card } from "@/components/primitives";
import { EventCard } from "@/components/events/event-card";
import { EventCardSkeleton } from "@/components/events/event-card-skeleton";
import { StaggerContainer, StaggerItem } from "@/components/ui/motion-wrapper";
import { DateRangePicker, type DateRangeValue } from "@/components/forms/date-range-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageShell } from "@/components/layout/page-shell";
import { getRoot, requestHal, type HalResource, type ProblemDetails } from "@/lib/hal-client";
import { parseAsInteger, parseAsString, parseAsStringEnum, useQueryStates } from "nuqs";
import {
  mapEventsToListItems,
  mapRootToEventsHref,
  type EventListItemViewModel,
  type EventsPayload,
} from "@/lib/view-models/events";
import {
  formatEventTimeContext,
  shiftMonthKey,
  toAgendaGroups,
  toCalendarMonthGrid,
  type DiscoveryView,
} from "@/lib/calendar-date-ui";
import {
  DEFAULT_PUBLIC_LIST_STATE,
  publicStatusToApiStatus,
  sortEvents,
  type EventSort,
  type PublicStatusFilter,
} from "@/lib/events-discovery-ui";
import { addDays, parseISO } from "@/lib/date-time";

export default function EventsPageClient() {
  const [queryState, setQueryState] = useQueryStates(
    {
      q: parseAsString.withDefault(DEFAULT_PUBLIC_LIST_STATE.q),
      page: parseAsInteger.withDefault(DEFAULT_PUBLIC_LIST_STATE.page),
      status: parseAsStringEnum(["upcoming", "all", "cancelled"] as const).withDefault(DEFAULT_PUBLIC_LIST_STATE.status),
      sort: parseAsStringEnum(["date-asc", "date-desc", "status"] as const).withDefault(DEFAULT_PUBLIC_LIST_STATE.sort),
      view: parseAsStringEnum(["list", "month", "agenda"] as const).withDefault(DEFAULT_PUBLIC_LIST_STATE.view),
      from: parseAsString.withDefault(""),
      to: parseAsString.withDefault(""),
    },
    {
      history: "push",
    },
  );

  const page = queryState.page;
  const searchQuery = queryState.q;
  const status = queryState.status as PublicStatusFilter;
  const sort = queryState.sort as EventSort;
  const view = queryState.view as DiscoveryView;
  const dateRange: DateRangeValue = { from: queryState.from, to: queryState.to };
  const [monthKey, setMonthKey] = useState<string | null>(null);
  const [events, setEvents] = useState<EventListItemViewModel[]>([]);
  const [previewEvent, setPreviewEvent] = useState<EventListItemViewModel | null>(null);
  const [queryInput, setQueryInput] = useState(searchQuery);
  const [loading, setLoading] = useState(true);
  const [problem, setProblem] = useState<ProblemDetails | null>(null);

  useEffect(() => {
    setQueryInput(searchQuery);
  }, [searchQuery]);

  const updateUrlState = (
    next: Partial<{
      q: string;
      page: number;
      status: PublicStatusFilter;
      sort: EventSort;
      view: DiscoveryView;
      from: string;
      to: string;
    }>,
  ) => {
    void setQueryState({
      ...(next.q !== undefined ? { q: next.q } : {}),
      ...(next.page !== undefined ? { page: next.page } : {}),
      ...(next.status !== undefined ? { status: next.status } : {}),
      ...(next.sort !== undefined ? { sort: next.sort } : {}),
      ...(next.view !== undefined ? { view: next.view } : {}),
      ...(next.from !== undefined ? { from: next.from } : {}),
      ...(next.to !== undefined ? { to: next.to } : {}),
    });
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setProblem(null);

      const rootResult = await getRoot();
      if (!rootResult.ok) {
        setProblem(rootResult.problem);
        setLoading(false);
        return;
      }

      const eventsHref = mapRootToEventsHref(rootResult.data as HalResource);
      if (!eventsHref) {
        setProblem({
          type: "about:blank",
          title: "Events Link Missing",
          status: 500,
          detail: "API root did not provide events affordance.",
        });
        setLoading(false);
        return;
      }

      const limit = view === "list" ? 5 : 100;
      const offset = (page - 1) * limit;
      const query = new URLSearchParams({
        limit: String(limit),
        offset: String(offset),
      });

      if (dateRange.from.trim().length > 0) {
        query.set("from", dateRange.from.trim());
      }
      if (dateRange.to.trim().length > 0) {
        // Treat the selected end date as inclusive by bumping it to end-of-day UTC.
        const endOfDay = (() => {
          try {
            const d = parseISO(dateRange.to.trim());
            d.setUTCHours(23, 59, 59, 999);
            return d.toISOString();
          } catch {
            return dateRange.to.trim();
          }
        })();
        query.set("to", endOfDay);
      }

      const apiStatus = publicStatusToApiStatus(status);
      if (apiStatus) {
        query.set("status", apiStatus);
      }

      if (searchQuery.trim().length > 0) {
        query.set("q", searchQuery.trim());
      }

      const eventsResult = await requestHal<EventsPayload>(`${eventsHref}?${query.toString()}`);
      if (!eventsResult.ok) {
        setProblem(eventsResult.problem);
        setLoading(false);
        return;
      }

      const nextEvents = sortEvents(mapEventsToListItems(eventsResult.data), sort);
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
      setLoading(false);
    };

    void load();
  }, [page, searchQuery, status, sort, view, dateRange.from, dateRange.to]);

  const monthGrid = toCalendarMonthGrid(events, monthKey);
  const agendaGroups = toAgendaGroups(events);
  const previewContext = previewEvent ? formatEventTimeContext(previewEvent) : null;

  return (
    <PageShell title="Events" subtitle="Discover current and upcoming events.">
      <Card className="p-4">
        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            updateUrlState({ q: queryInput, page: 1 });
          }}
        >
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="events-search">Search</Label>
            <Input
              id="events-search"
              value={queryInput}
              onChange={(event) => setQueryInput(event.target.value)}
              placeholder="Search by title"
            />
          </div>
          <Button type="submit" intent="primary">
            Search
          </Button>
        </form>

        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5">
            <DateRangePicker
              label="Date range"
              value={dateRange}
              onChange={(next) => {
                updateUrlState({ from: next.from, to: next.to, page: 1 });
              }}
            />
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <Button
              intent="secondary"
              onClick={() => {
                const now = new Date();
                const from = now.toISOString();
                const to = addDays(from, 7);
                updateUrlState({ from, to, page: 1 });
              }}
            >
              This week
            </Button>
            <Button
              intent="secondary"
              onClick={() => {
                const now = new Date();
                const from = now.toISOString();
                const endOfMonth = new Date(
                  Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999),
                ).toISOString();
                updateUrlState({ from, to: endOfMonth, page: 1 });
              }}
            >
              This month
            </Button>
            <Button
              intent="secondary"
              onClick={() => {
                updateUrlState({ status: "upcoming", from: "", to: "", page: 1 });
              }}
            >
              Upcoming
            </Button>
            <Button
              intent="secondary"
              onClick={() => {
                updateUrlState({ from: "", to: "", page: 1 });
              }}
            >
              Clear
            </Button>
          </div>
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="events-visibility">Visibility</Label>
            <Select
              value={status}
              onValueChange={(value) => updateUrlState({ status: value as PublicStatusFilter, page: 1 })}
            >
              <SelectTrigger id="events-visibility" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="upcoming">Upcoming</SelectItem>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="events-sort">Sort</Label>
            <Select value={sort} onValueChange={(value) => updateUrlState({ sort: value as EventSort, page: 1 })}>
              <SelectTrigger id="events-sort" className="w-full">
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

        <div className="mt-3 flex flex-wrap gap-2">
          {([
            { label: "List", value: "list" },
            { label: "Month", value: "month" },
            { label: "Agenda", value: "agenda" },
          ] as const).map((option) => (
            <Button
              key={option.value}
              intent={view === option.value ? "primary" : "secondary"}
              onClick={() => updateUrlState({ view: option.value, page: 1 })}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </Card>

      <div className="mt-4">
        {loading ? (
          view === "list" ? (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <EventCardSkeleton key={index} />
              ))}
            </div>
          ) : (
            <LoadingState title="Loading events" rows={5} />
          )
        ) : null}
        {problem ? (
          <div className="space-y-3">
            <ProblemDetailsPanel problem={problem} />
            <ErrorState
              title="We couldn’t load events"
              description="Try again or adjust your search criteria."
              action={
                <Button intent="secondary" onClick={() => updateUrlState({ page })}>
                  Retry
                </Button>
              }
              supportCode={problem.request_id}
            />
          </div>
        ) : null}

        {!loading && !problem ? (
          events.length > 0 ? (
            <>
              {view === "list" ? (
                <>
                  <StaggerContainer className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {events.map((eventItem) => (
                      <StaggerItem key={eventItem.id}>
                        <EventCard
                          model={{
                            id: eventItem.id,
                            slug: eventItem.slug,
                            title: eventItem.title,
                            status: eventItem.status,
                            startAt: eventItem.startAt,
                            endAt: eventItem.endAt,
                            timezone: eventItem.timezone,
                            detailHref: eventItem.detailHref,
                            locationText: eventItem.locationText ?? null,
                            meetingUrl: eventItem.meetingUrl ?? null,
                            description: eventItem.description ?? null,
                            metadataJson: eventItem.metadataJson ?? null,
                          }}
                        />
                      </StaggerItem>
                    ))}
                  </StaggerContainer>
                  <div className="mt-4 flex items-center gap-2">
                    <Button
                      intent="secondary"
                      disabled={page <= 1}
                      onClick={() => updateUrlState({ page: page - 1 })}
                    >
                      Previous
                    </Button>
                    <span className="type-label text-text-secondary">Page {page}</span>
                    <Button
                      intent="secondary"
                      disabled={events.length < 5}
                      onClick={() => updateUrlState({ page: page + 1 })}
                    >
                      Next
                    </Button>
                  </div>
                </>
              ) : null}

              {view === "month" ? (
                <div className="space-y-3">
                  <Card className="p-3">
                    <div className="flex items-center justify-between">
                      <Button intent="secondary" onClick={() => setMonthKey(shiftMonthKey(monthGrid.monthKey, -1))}>
                        Previous month
                      </Button>
                      <p className="type-title">{monthGrid.monthLabel}</p>
                      <Button intent="secondary" onClick={() => setMonthKey(shiftMonthKey(monthGrid.monthKey, 1))}>
                        Next month
                      </Button>
                    </div>
                  </Card>
                  <div className="grid grid-cols-7 gap-2">
                    {monthGrid.weeks.flat().map((day) => (
                      <Card key={day.dateKey} className={`min-h-24 p-2 ${day.inMonth ? "" : "opacity-60"}`}>
                        <p className="type-meta text-text-muted">{day.dayOfMonth}</p>
                        <div className="mt-1 space-y-1">
                          {day.items.slice(0, 2).map((eventItem) => (
                            <button
                              key={eventItem.id}
                              type="button"
                              className="block w-full rounded-sm border border-border-default px-2 py-1 text-left type-meta"
                              onClick={() => setPreviewEvent(eventItem)}
                            >
                              {eventItem.title}
                            </button>
                          ))}
                          {day.items.length > 2 ? <p className="type-meta text-text-muted">+{day.items.length - 2} more</p> : null}
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              ) : null}

              {view === "agenda" ? (
                <div className="space-y-3">
                  {agendaGroups.map((group) => (
                    <Card key={group.dateKey} className="p-4">
                      <p className="type-title">{group.dateKey}</p>
                      <ul className="mt-2 space-y-2">
                        {group.items.map((eventItem) => {
                          const context = formatEventTimeContext(eventItem);
                          return (
                            <li
                              key={eventItem.id}
                              className="flex items-center justify-between gap-3 rounded-sm border border-border-default p-2"
                            >
                              <button type="button" className="text-left" onClick={() => setPreviewEvent(eventItem)}>
                                <p className="type-label">{eventItem.title}</p>
                                <p className="type-meta text-text-muted">
                                  {context.eventRange} ({context.eventTimezone})
                                </p>
                                <p className="type-meta text-text-muted">
                                  Local: {context.localRange} ({context.localTimezone})
                                </p>
                              </button>
                              <Link href={eventItem.detailHref} prefetch className="type-label underline">
                                View
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    </Card>
                  ))}
                </div>
              ) : null}

              {previewEvent && previewContext ? (
                <Card className="mt-4 p-4">
                  <h2 className="type-title">Quick preview</h2>
                  <p className="mt-2 type-label">{previewEvent.title}</p>
                  <p className="type-meta text-text-muted">
                    {previewContext.eventRange} ({previewContext.eventTimezone})
                  </p>
                  <p className="type-meta text-text-muted">
                    Local: {previewContext.localRange} ({previewContext.localTimezone})
                  </p>
                  <div className="mt-2 flex items-center gap-3">
                    <Link href={previewEvent.detailHref} prefetch className="type-label underline">
                      Open event details
                    </Link>
                  </div>
                </Card>
              ) : null}
            </>
          ) : (
            <EmptyState
              title="No events match your filters"
              description={
                dateRange.from.trim().length > 0 || dateRange.to.trim().length > 0
                  ? "No events match your date range. Try expanding your search."
                  : "Try different search terms or clear filters to browse all events."
              }
              action={
                <Button
                  intent="secondary"
                  onClick={() => {
                    setQueryInput("");
                    updateUrlState({
                      q: DEFAULT_PUBLIC_LIST_STATE.q,
                      status: DEFAULT_PUBLIC_LIST_STATE.status,
                      sort: DEFAULT_PUBLIC_LIST_STATE.sort,
                      page: DEFAULT_PUBLIC_LIST_STATE.page,
                      from: "",
                      to: "",
                    });
                  }}
                >
                  Clear filters
                </Button>
              }
            />
          )
        ) : null}
      </div>
    </PageShell>
  );
}
