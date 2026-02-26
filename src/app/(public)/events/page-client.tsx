"use client";

import { useEffect, useRef, useState } from "react";
import { ProblemDetailsPanel } from "@/components/problem-details";
import { EmptyState, ErrorState } from "@/components/patterns";
import { Button } from "@/components/primitives";
import { EventsFilterBar, computeQuickFilterDates } from "@/components/events/events-filter-bar";
import { EventsViewToolbar } from "@/components/events/events-view-toolbar";
import { EventsListView } from "@/components/events/events-list-view";
import { EventsMonthView } from "@/components/events/events-month-view";
import { EventsAgendaView } from "@/components/events/events-agenda-view";
import { PageShell } from "@/components/layout/page-shell";
import { getRoot, requestHal, type HalResource, type ProblemDetails } from "@/lib/hal-client";
import { parseAsInteger, parseAsString, parseAsStringEnum, useQueryStates } from "nuqs";
import {
  mapEventsToListItems,
  mapRootToEventsHref,
  type EventListItemViewModel,
  type EventsPayload,
} from "@/lib/view-models/events";
import type { DiscoveryView } from "@/lib/calendar-date-ui";
import {
  DEFAULT_PUBLIC_LIST_STATE,
  publicStatusToApiStatus,
  sortEvents,
  type EventSort,
  type PublicStatusFilter,
} from "@/lib/events-discovery-ui";
import { parseISO } from "@/lib/date-time";

const LIST_PAGE_SIZE = 5;
const CALENDAR_PAGE_SIZE = 100;

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
    { history: "push" },
  );

  const page = queryState.page;
  const searchQuery = queryState.q;
  const status = queryState.status as PublicStatusFilter;
  const sort = queryState.sort as EventSort;
  const view = queryState.view as DiscoveryView;
  const dateRange = { from: queryState.from, to: queryState.to };
  const [monthKey, setMonthKey] = useState<string | null>(null);
  const [events, setEvents] = useState<EventListItemViewModel[]>([]);
  const [queryInput, setQueryInput] = useState(searchQuery);
  const [loading, setLoading] = useState(true);
  const [problem, setProblem] = useState<ProblemDetails | null>(null);

  const isFirstRender = useRef(true);
  useEffect(() => {
    isFirstRender.current = false;
  }, []);

  useEffect(() => {
    setQueryInput(searchQuery);
  }, [searchQuery]);

  const update = (next: Partial<typeof queryState>) => {
    void setQueryState(
      Object.fromEntries(Object.entries(next).filter(([, v]) => v !== undefined)),
    );
  };

  /* ---- Data fetching ---- */
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

      const limit = view === "list" ? LIST_PAGE_SIZE : CALENDAR_PAGE_SIZE;
      const offset = (page - 1) * limit;
      const query = new URLSearchParams({ limit: String(limit), offset: String(offset) });

      if (dateRange.from.trim()) query.set("from", dateRange.from.trim());
      if (dateRange.to.trim()) {
        try {
          const d = parseISO(dateRange.to.trim());
          d.setUTCHours(23, 59, 59, 999);
          query.set("to", d.toISOString());
        } catch {
          query.set("to", dateRange.to.trim());
        }
      }

      const apiStatus = publicStatusToApiStatus(status);
      if (apiStatus) query.set("status", apiStatus);
      if (searchQuery.trim()) query.set("q", searchQuery.trim());

      const eventsResult = await requestHal<EventsPayload>(
        `${eventsHref}?${query.toString()}`,
      );
      if (!eventsResult.ok) {
        setProblem(eventsResult.problem);
        setLoading(false);
        return;
      }

      const nextEvents = sortEvents(mapEventsToListItems(eventsResult.data), sort);
      setEvents(nextEvents);

      if (nextEvents.length > 0) {
        const first = new Date(nextEvents[0].startAt);
        const key = `${first.getFullYear()}-${String(first.getMonth() + 1).padStart(2, "0")}`;
        setMonthKey((cur) => cur ?? key);
      }
      setLoading(false);
    };

    void load();
  }, [page, searchQuery, status, sort, view, dateRange.from, dateRange.to]);

  /* ---- Render ---- */
  return (
    <PageShell title="Events" subtitle="Discover upcoming sessions.">
      <EventsFilterBar
        searchQuery={queryInput}
        onSearchChange={setQueryInput}
        onSearchSubmit={() => update({ q: queryInput, page: 1 })}
        dateRange={dateRange}
        onDateRangeChange={(r) => update({ from: r.from, to: r.to, page: 1 })}
        status={status}
        onStatusChange={(s) => update({ status: s, page: 1 })}
        onQuickFilter={(preset) => {
          const result = computeQuickFilterDates(preset);
          update({
            from: result.from,
            to: result.to,
            page: 1,
            ...(result.status ? { status: result.status } : {}),
          });
        }}
      />

      <EventsViewToolbar
        view={view}
        onViewChange={(v) => update({ view: v, page: 1 })}
        sort={sort}
        onSortChange={(s) => update({ sort: s, page: 1 })}
      />

      <div className="mt-4">
        {problem ? (
          <div className="space-y-3">
            <ProblemDetailsPanel problem={problem} />
            <ErrorState
              title="We couldn't load events"
              description="Try again or adjust your search criteria."
              action={
                <Button intent="secondary" onClick={() => update({ page })}>
                  Retry
                </Button>
              }
              supportCode={problem.request_id}
            />
          </div>
        ) : !loading && events.length === 0 ? (
          <EmptyState
            title="No events match your filters"
            description={
              dateRange.from.trim() || dateRange.to.trim()
                ? "No events match your date range. Try expanding your search."
                : "Try different search terms or clear filters to browse all events."
            }
            action={
              <Button
                intent="secondary"
                onClick={() => {
                  setQueryInput("");
                  update({
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
        ) : (
          <>
            {view === "list" ? (
              <EventsListView
                events={events}
                page={page}
                pageSize={LIST_PAGE_SIZE}
                onPageChange={(p) => update({ page: p })}
                loading={loading}
                isFirstRender={isFirstRender.current}
              />
            ) : null}

            {view === "month" ? (
              <EventsMonthView
                events={events}
                monthKey={monthKey}
                onMonthChange={setMonthKey}
                loading={loading}
              />
            ) : null}

            {view === "agenda" ? (
              <EventsAgendaView events={events} loading={loading} />
            ) : null}
          </>
        )}
      </div>
    </PageShell>
  );
}
