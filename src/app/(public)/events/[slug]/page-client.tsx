"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ProblemDetailsPanel } from "@/components/problem-details";
import { Breadcrumbs } from "@/components/patterns";
import { Button, Card } from "@/components/primitives";
import { Countdown } from "@/components/ui/countdown";
import { RelativeTime } from "@/components/forms/relative-time";
import { buildGoogleCalendarUrl } from "@/lib/calendar-links";
import { formatEventPrimaryRange, formatTimeZoneLabel } from "@/lib/event-date-ui";
import { follow, getRoot, requestHal, type HalResource, type ProblemDetails } from "@/lib/hal-client";
import { attendanceInstructions } from "@/lib/event-delivery";
import { REGISTRATION_CANCELLED_MESSAGE, registrationCreateMessage } from "@/lib/registration-feedback";
import { normalizeRegistrationStatus, resolvePrimaryAction, statusChipClass } from "@/lib/event-detail-action";
import { parseISO } from "@/lib/date-time";

type EventResource = {
  id: string;
  slug: string;
  title: string;
  status: string;
  timezone: string;
  engagement_type: "INDIVIDUAL" | "GROUP";
  delivery_mode: "ONLINE" | "IN_PERSON" | "HYBRID";
  location_text: string | null;
  meeting_url: string | null;
  instructor_state: "TBA" | "PROPOSED" | "ASSIGNED" | "CONFIRMED" | "REASSIGNED";
  instructor_id: string | null;
  instructor_name: string | null;
  description: string | null;
  metadata_json: string | null;
  start_at: string;
  end_at: string;
  _links: Record<string, { href: string }>;
};

type EventListPayload = {
  items: Array<{
    slug: string;
    _links?: Record<string, { href: string }>;
  }>;
};

type MeResponse = {
  id: string;
  email: string;
  _links: Record<string, { href: string }>;
};

type NavContextResponse = {
  audience?: "guest" | "user" | "admin";
};

type RegistrationsList = {
  items: Array<{
    user_id: string;
    status: "REGISTERED" | "WAITLISTED" | "CANCELLED" | "CHECKED_IN";
  }>;
};

export default function EventDetailPageClient() {
  const params = useParams<{ slug: string }>();
  const [event, setEvent] = useState<EventResource | null>(null);
  const [me, setMe] = useState<MeResponse | null>(null);
  const [registrationStatus, setRegistrationStatus] = useState<string | null>(null);
  const [actionPending, setActionPending] = useState(false);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [problem, setProblem] = useState<ProblemDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const normalizedStatus = normalizeRegistrationStatus(registrationStatus);

  const primaryAction = resolvePrimaryAction({
    loggedIn: Boolean(me),
    registrationStatus: normalizedStatus,
    links: event?._links ?? {},
  });

  const statusChipTone = statusChipClass(normalizedStatus);

  const eventRangePrimary = event
    ? formatEventPrimaryRange({ startIso: event.start_at, endIso: event.end_at, timezone: event.timezone })
    : null;
  const timezoneLabel = event ? formatTimeZoneLabel({ isoString: event.start_at, timezone: event.timezone }) : null;

  const registerByLabel = eventRangePrimary ? eventRangePrimary.split(" · ")[0] : "Event start";

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const msUntilStart = useMemo(() => {
    if (!event) return null;
    try {
      return parseISO(event.start_at).getTime() - nowMs;
    } catch {
      return null;
    }
  }, [event, nowMs]);

  const showClosingSoon = msUntilStart !== null && msUntilStart > 0 && msUntilStart <= 7 * 24 * 60 * 60 * 1000;

  const eventMetadata = useMemo(() => {
    if (!event?.metadata_json) return null;
    try {
      return JSON.parse(event.metadata_json) as {
        capability?: string | null;
        spellBookTerms?: string[];
        artifacts?: string[];
        offerSlug?: string | null;
      };
    } catch {
      return null;
    }
  }, [event]);

  const calendarLocation = event
    ? [event.location_text, event.meeting_url]
        .filter((value): value is string => Boolean(value && value.trim().length > 0))
        .join(" · ")
    : "";
  const detailsUrl = typeof window !== "undefined" && event ? `${window.location.origin}/events/${event.slug}` : null;
  const googleCalendarUrl =
    event && detailsUrl
      ? buildGoogleCalendarUrl({
          title: event.title,
          startIso: event.start_at,
          endIso: event.end_at,
          location: calendarLocation,
          detailsUrl,
        })
      : null;

  const jsonLd = useMemo(() => {
    if (!event || !detailsUrl) return null;

    const isOnline = event.delivery_mode === "ONLINE" || Boolean(event.meeting_url);
    const location = isOnline
      ? {
          "@type": "VirtualLocation",
          url: event.meeting_url ?? detailsUrl,
        }
      : {
          "@type": "Place",
          name: event.location_text ?? "Event location",
        };

    return {
      "@context": "https://schema.org",
      "@type": "Event",
      name: event.title,
      startDate: event.start_at,
      endDate: event.end_at,
      eventStatus: event.status,
      location,
      url: detailsUrl,
    };
  }, [event, detailsUrl]);

  const loadRegistrationStatus = async (eventSelfHref: string, userId: string) => {
    const result = await requestHal<RegistrationsList>(`${eventSelfHref}/registrations`);
    if (!result.ok) {
      if (result.problem.status === 404) {
        setRegistrationStatus(null);
        return;
      }
      setProblem(result.problem);
      return;
    }

    const mine = result.data.items.find((item) => item.user_id === userId);
    setRegistrationStatus(mine?.status ?? null);
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setProblem(null);

      const slug = params.slug;
      if (!slug) {
        setLoading(false);
        return;
      }
      const rootResult = await getRoot();
      if (!rootResult.ok) {
        setProblem(rootResult.problem);
        setLoading(false);
        return;
      }

      const eventsLink = follow(rootResult.data as HalResource, "events");
      if (!eventsLink) {
        setProblem({
          type: "about:blank",
          title: "Events Link Missing",
          status: 500,
          detail: "API root did not provide events affordance.",
        });
        setLoading(false);
        return;
      }

      const collectionResult = await requestHal<EventListPayload>(eventsLink.href);
      let detailHref = `${eventsLink.href}/${slug}`;

      if (collectionResult.ok) {
        const found = collectionResult.data.items?.find((item) => item.slug === slug);
        if (found?._links?.self?.href) {
          detailHref = found._links.self.href;
        }
      }

      const detailResult = await requestHal<EventResource>(detailHref);
      if (!detailResult.ok) {
        setProblem(detailResult.problem);
        setLoading(false);
        return;
      }

      setEvent(detailResult.data);

      const navContextResult = await requestHal<NavContextResponse>("/api/v1/nav/context");
      if (!navContextResult.ok) {
        setProblem(navContextResult.problem);
        setLoading(false);
        return;
      }

      if (navContextResult.data.audience === "guest") {
        setMe(null);
      } else {
        const meResult = await requestHal<MeResponse>("/api/v1/me");
        if (!meResult.ok) {
          setProblem(meResult.problem);
          setLoading(false);
          return;
        }

        setMe(meResult.data);
        const eventSelfHref = detailResult.data._links.self?.href ?? detailHref;
        await loadRegistrationStatus(eventSelfHref, meResult.data.id);
      }

      setLoading(false);
    };

    void load();
  }, [params.slug]);

  const onRegister = async () => {
    if (!event || !me) {
      return;
    }

    setActionPending(true);
    setProblem(null);

    const endpoint = `${event._links.self?.href ?? `/api/v1/events/${event.slug}`}/registrations`;
    const result = await requestHal<{ status: string }>(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ user_id: me.id }),
    });

    if (!result.ok) {
      setProblem(result.problem);
      setActionPending(false);
      return;
    }

    setRegistrationStatus(result.data.status);
    setConfirmation(registrationCreateMessage(result.data.status));
    setActionPending(false);

    window.setTimeout(() => setConfirmation(null), 2200);
  };

  const onCancel = async () => {
    if (!event || !me) {
      return;
    }

    setActionPending(true);
    setProblem(null);

    const endpoint = `${event._links.self?.href ?? `/api/v1/events/${event.slug}`}/registrations/${me.id}`;
    const result = await requestHal<{ status: string }>(endpoint, {
      method: "DELETE",
    });

    if (!result.ok) {
      setProblem(result.problem);
      setActionPending(false);
      return;
    }

    setRegistrationStatus(result.data.status);
    setConfirmation(REGISTRATION_CANCELLED_MESSAGE);
    setActionPending(false);

    window.setTimeout(() => setConfirmation(null), 2200);
  };

  return (
    <main className="container-grid py-6 pb-24 lg:pb-6">
      {jsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      ) : null}

      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Events", href: "/events" },
          { label: event?.title ?? params.slug ?? "Event" },
        ]}
      />
      {loading ? <p className="type-body-sm">Loading event...</p> : null}
      {problem ? (
        problem.status === 404 ? (
          <Card className="mt-4 p-4">
            <h1 className="type-h2">This event doesn’t exist or has been removed.</h1>
            <p className="mt-2 type-body-sm text-text-secondary">
              Try browsing the latest events, or double-check the link you followed.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/events" className="underline type-label">
                Browse events
              </Link>
              <Link href="/" className="underline type-label">
                Go home
              </Link>
            </div>
          </Card>
        ) : (
          <ProblemDetailsPanel problem={problem} />
        )
      ) : null}
      {event ? (
        <article className="grid gap-4 lg:grid-cols-[1fr_18rem]">
          <Card className="space-y-4 p-4">
            <h1 className="type-h2">{event.title}</h1>
            {eventRangePrimary ? (
              <div className="space-y-1">
                <p className="type-body-sm text-text-primary">{eventRangePrimary}</p>
                <p className="type-meta text-text-muted">{timezoneLabel}</p>
                <p className="type-meta text-text-secondary">
                  {msUntilStart !== null && msUntilStart <= 0 ? "Started " : "Starts "}
                  <RelativeTime iso={event.start_at} />
                </p>
              </div>
            ) : null}

            <p className="type-body-sm text-text-secondary">Event status: {event.status}</p>
            <p className="type-body-sm text-text-secondary">Engagement: {event.engagement_type}</p>
            <p className="type-meta text-text-muted">
              {attendanceInstructions({
                deliveryMode: event.delivery_mode,
                locationText: event.location_text,
                meetingUrl: event.meeting_url,
              })}
            </p>
            <p className="type-meta text-text-muted">
              Instructor: {event.instructor_name ? event.instructor_name : "TBA"} ({event.instructor_state})
            </p>

            {event.description ? (
              <div className="space-y-1">
                <h2 className="type-title">About this event</h2>
                <p className="type-body-sm text-text-secondary">{event.description}</p>
              </div>
            ) : null}

            {eventMetadata?.capability ? (
              <div className="space-y-1">
                <h2 className="type-title">Human Edge Capability</h2>
                <span className="inline-block rounded-sm bg-surface-muted px-2 py-1 type-label text-text-primary">
                  {eventMetadata.capability}
                </span>
              </div>
            ) : null}

            {eventMetadata?.spellBookTerms && eventMetadata.spellBookTerms.length > 0 ? (
              <div className="space-y-2">
                <h2 className="type-title">Spell Book Terms</h2>
                <div className="flex flex-wrap gap-1">
                  {eventMetadata.spellBookTerms.map((term) => (
                    <span key={term} className="inline-block rounded-sm border border-border-default px-2 py-0.5 type-meta text-text-secondary">
                      {term}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {eventMetadata?.artifacts && eventMetadata.artifacts.length > 0 ? (
              <div className="space-y-2">
                <h2 className="type-title">What You&apos;ll Take Home</h2>
                <ul className="list-inside list-disc space-y-1">
                  {eventMetadata.artifacts.map((artifact) => (
                    <li key={artifact} className="type-body-sm text-text-secondary">{artifact}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {showClosingSoon ? (
              <Card className="p-3">
                <p className="type-label text-text-primary">Registration closes soon</p>
                <p className="mt-1 type-meta text-text-secondary">
                  Register by {registerByLabel} · {timezoneLabel ?? event.timezone}
                </p>
                <p className="mt-1">
                  <Countdown deadlineIso={event.start_at} />
                </p>
              </Card>
            ) : null}

            <Card className="p-3">
              <h2 className="type-title">Your registration</h2>
              <div className="mt-2 flex items-center gap-2">
                <span className={`rounded-sm px-2 py-1 type-meta ${statusChipTone}`}>{normalizedStatus}</span>
                {confirmation ? <span className="type-meta text-state-success">Updated just now</span> : null}
              </div>

              {event._links["app:ics"] &&
              me &&
              (normalizedStatus === "REGISTERED" || normalizedStatus === "WAITLISTED" || normalizedStatus === "CHECKED_IN") ? (
                <div className="mt-3 space-y-2">
                  <p className="type-meta text-text-secondary">Add to calendar</p>
                  <div className="flex flex-wrap gap-2">
                    {googleCalendarUrl ? (
                      <Button
                        intent="secondary"
                        onClick={() => window.open(googleCalendarUrl, "_blank", "noopener,noreferrer")}
                      >
                        Google Calendar
                      </Button>
                    ) : null}
                    <Button
                      intent="secondary"
                      onClick={() => window.open(event._links["app:ics"].href, "_blank", "noopener,noreferrer")}
                    >
                      Download .ics
                    </Button>
                  </div>
                </div>
              ) : null}

              {!me ? (
                <p className="mt-2 type-body-sm text-text-secondary">
                  <Link href="/login" className="underline">
                    Login
                  </Link>{" "}
                  to register.
                </p>
              ) : null}
            </Card>
          </Card>

          <aside className="hidden lg:block">
            <Card className="sticky top-6 space-y-3 p-4">
              <h2 className="type-title">Next action</h2>
              <p className="type-body-sm text-text-secondary">Primary action for your current state.</p>

              {primaryAction.kind === "register" || primaryAction.kind === "waitlist" ? (
                <Button intent="primary" fullWidth disabled={actionPending} onClick={() => void onRegister()}>
                  {actionPending
                    ? "Working..."
                    : event.engagement_type === "GROUP"
                      ? primaryAction.kind === "waitlist"
                        ? "Join group waitlist"
                        : "Join group roster"
                      : primaryAction.label}
                </Button>
              ) : null}

              {primaryAction.kind === "cancel" ? (
                <Button intent="secondary" fullWidth disabled={actionPending} onClick={() => void onCancel()}>
                  {actionPending ? "Working..." : primaryAction.label}
                </Button>
              ) : null}

              {primaryAction.kind === "login" ? (
                <Button intent="primary" fullWidth onClick={() => (window.location.href = "/login")}>
                  {primaryAction.label}
                </Button>
              ) : null}

              {primaryAction.kind === "none" ? (
                <p className="type-body-sm text-text-muted">No action is available for this event state.</p>
              ) : null}
            </Card>
          </aside>
        </article>
      ) : null}

      {event && primaryAction.kind !== "none" ? (
        <div className="fixed inset-x-0 bottom-0 border-t border-border-default bg-surface p-3 lg:hidden">
          <div className="container-grid">
            {primaryAction.kind === "register" || primaryAction.kind === "waitlist" ? (
              <Button intent="primary" fullWidth disabled={actionPending} onClick={() => void onRegister()}>
                {actionPending ? "Working..." : primaryAction.label}
              </Button>
            ) : null}
            {primaryAction.kind === "cancel" ? (
              <Button intent="secondary" fullWidth disabled={actionPending} onClick={() => void onCancel()}>
                {actionPending ? "Working..." : primaryAction.label}
              </Button>
            ) : null}
            {primaryAction.kind === "login" ? (
              <Button intent="primary" fullWidth onClick={() => (window.location.href = "/login")}>
                {primaryAction.label}
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      {confirmation ? (
        <div className="fixed bottom-20 right-4 z-20 rounded-sm border border-state-success bg-surface px-3 py-2 type-label text-state-success lg:bottom-4">
          {confirmation}
        </div>
      ) : null}
    </main>
  );
}
