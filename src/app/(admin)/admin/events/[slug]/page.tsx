"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { DateTimePicker } from "@/components/forms";
import { PageShell } from "@/components/layout/page-shell";
import { ProblemDetailsPanel } from "@/components/problem-details";
import { Button, Card } from "@/components/primitives";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getEventActionHrefs } from "@/lib/admin-events-view";
import { formatEventTimeContext } from "@/lib/calendar-date-ui";
import { requestHal, type ProblemDetails } from "@/lib/hal-client";

type EventDetail = {
  id: string;
  slug: string;
  title: string;
  status: string;
  start_at: string;
  end_at: string;
  timezone: string;
  engagement_type: "INDIVIDUAL" | "GROUP";
  delivery_mode: "ONLINE" | "IN_PERSON" | "HYBRID";
  location_text: string | null;
  meeting_url: string | null;
  instructor_state: "TBA" | "PROPOSED" | "ASSIGNED" | "CONFIRMED" | "REASSIGNED";
  instructor_id: string | null;
  instructor_name: string | null;
  capacity: number | null;
  _links: Record<string, { href: string }>;
};

type InstructorListPayload = {
  items: Array<{
    id: string;
    name: string;
    email: string;
    status: "ACTIVE" | "INACTIVE";
  }>;
};

type RegistrationCountsPayload = {
  items: Array<{ slug: string; count: number }>;
};

const UNASSIGNED_INSTRUCTOR_VALUE = "__UNASSIGNED__";

export default function AdminEventDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const [event, setEvent] = useState<EventDetail | null>(null);
  const [problem, setProblem] = useState<ProblemDetails | null>(null);
  const [pending, setPending] = useState(false);

  const [registrationCount, setRegistrationCount] = useState(0);
  const [instructors, setInstructors] = useState<InstructorListPayload["items"]>([]);

  const [title, setTitle] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [engagementType, setEngagementType] = useState<"INDIVIDUAL" | "GROUP">("INDIVIDUAL");
  const [deliveryMode, setDeliveryMode] = useState<"ONLINE" | "IN_PERSON" | "HYBRID">("ONLINE");
  const [locationText, setLocationText] = useState("");
  const [meetingUrl, setMeetingUrl] = useState("");
  const [capacity, setCapacity] = useState("");

  const [assignmentState, setAssignmentState] = useState<"TBA" | "PROPOSED" | "ASSIGNED" | "CONFIRMED" | "REASSIGNED">("TBA");
  const [assignmentInstructorId, setAssignmentInstructorId] = useState(UNASSIGNED_INSTRUCTOR_VALUE);
  const [assignmentNote, setAssignmentNote] = useState("");

  const [notifyAttendees, setNotifyAttendees] = useState(false);

  const hasDateChange = Boolean(event && (start !== event.start_at || end !== event.end_at));
  const beforeContext = useMemo(() => {
    if (!event || !hasDateChange) {
      return null;
    }
    return formatEventTimeContext({ startAt: event.start_at, endAt: event.end_at, timezone: event.timezone });
  }, [event, hasDateChange]);

  const afterContext = useMemo(() => {
    if (!event || !hasDateChange) {
      return null;
    }
    return formatEventTimeContext({ startAt: start, endAt: end, timezone: event.timezone });
  }, [event, hasDateChange, start, end]);

  const load = async () => {
    if (!slug) {
      return;
    }

    const [eventResult, instructorResult, countsResult] = await Promise.all([
      requestHal<EventDetail>(`/api/v1/events/${slug}`),
      requestHal<InstructorListPayload>("/api/v1/instructors"),
      requestHal<RegistrationCountsPayload>("/api/v1/admin/events/registration-counts", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ slugs: [slug] }),
      }),
    ]);

    if (!eventResult.ok) {
      setProblem(eventResult.problem);
      return;
    }

    setProblem(null);
    setEvent(eventResult.data);

    setTitle(eventResult.data.title);
    setStart(eventResult.data.start_at);
    setEnd(eventResult.data.end_at);
    setEngagementType(eventResult.data.engagement_type ?? "INDIVIDUAL");
    setDeliveryMode(eventResult.data.delivery_mode ?? "ONLINE");
    setLocationText(eventResult.data.location_text ?? "");
    setMeetingUrl(eventResult.data.meeting_url ?? "");
    setCapacity(eventResult.data.capacity === null ? "" : String(eventResult.data.capacity));

    setAssignmentState(eventResult.data.instructor_state ?? "TBA");
    setAssignmentInstructorId(eventResult.data.instructor_id ?? UNASSIGNED_INSTRUCTOR_VALUE);
    setNotifyAttendees(false);

    if (instructorResult.ok) {
      setInstructors(instructorResult.data.items ?? []);
    } else {
      setInstructors([]);
    }

    if (countsResult.ok) {
      const count = countsResult.data.items?.[0]?.count;
      setRegistrationCount(typeof count === "number" ? count : 0);
    } else {
      setRegistrationCount(0);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const onSave = async () => {
    if (!slug) {
      return;
    }

    setPending(true);
    setProblem(null);

    const result = await requestHal<unknown>(`/api/v1/events/${slug}`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        title,
        start,
        end,
        engagement_type: engagementType,
        delivery_mode: deliveryMode,
        location_text: locationText,
        meeting_url: meetingUrl,
        capacity: capacity.trim().length ? Number(capacity) : undefined,
      }),
    });

    if (!result.ok) {
      setProblem(result.problem);
      setPending(false);
      return;
    }

    await load();
    setPending(false);
  };

  const onAction = async (href: string, body?: Record<string, unknown>) => {
    setPending(true);
    setProblem(null);

    const result = await requestHal<unknown>(href, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!result.ok) {
      setProblem(result.problem);
      setPending(false);
      return;
    }

    await load();
    setPending(false);
  };

  const onUpdateInstructorAssignment = async () => {
    if (!slug) {
      return;
    }

    setPending(true);
    setProblem(null);

    const instructorId =
      assignmentInstructorId !== UNASSIGNED_INSTRUCTOR_VALUE && assignmentInstructorId.trim().length > 0
        ? assignmentInstructorId
        : undefined;

    const result = await requestHal<unknown>(`/api/v1/events/${slug}/instructor`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        state: assignmentState,
        instructor_id: instructorId,
        note: assignmentNote.trim().length > 0 ? assignmentNote : undefined,
      }),
    });

    if (!result.ok) {
      setProblem(result.problem);
      setPending(false);
      return;
    }

    await load();
    setAssignmentNote("");
    setPending(false);
  };

  const actions = event ? getEventActionHrefs(event) : { publish: null, cancel: null };

  return (
    <PageShell
      title={event ? event.title : "Event"}
      subtitle={slug ? `Slug: ${slug}` : undefined}
      breadcrumbs={[
        { label: "Admin", href: "/admin" },
        { label: "Events", href: "/admin/events" },
        { label: event?.title ?? slug ?? "Event" },
      ]}
    >
      {problem ? (
        <div className="mt-4">
          <ProblemDetailsPanel problem={problem} />
        </div>
      ) : null}

      {event ? (
        <>
          <Card className="p-4">
            <h2 className="type-title">Edit event</h2>

            {hasDateChange && beforeContext && afterContext ? (
              <Card className="mt-3 p-3">
                <p className="type-label text-text-primary">Schedule change preview</p>
                <div className="mt-2 grid gap-3 md:grid-cols-2">
                  <div>
                    <p className="type-meta text-text-muted">Before</p>
                    <p className="type-meta text-text-secondary">{beforeContext.eventRange}</p>
                    <p className="type-meta text-text-muted">{beforeContext.eventTimezone}</p>
                  </div>
                  <div>
                    <p className="type-meta text-text-muted">After</p>
                    <p className="type-meta text-text-secondary">{afterContext.eventRange}</p>
                    <p className="type-meta text-text-muted">{afterContext.eventTimezone}</p>
                  </div>
                </div>

                <div className="mt-3 rounded-sm border border-state-warning bg-surface p-3">
                  <p className="type-label text-text-primary">Participant impact</p>
                  <p className="mt-1 type-meta text-text-secondary">
                    This change affects {registrationCount} registered attendee{registrationCount === 1 ? "" : "s"}.
                  </p>
                  <label className="mt-2 flex items-center gap-2 type-meta text-text-secondary">
                    <input
                      type="checkbox"
                      checked={notifyAttendees}
                      onChange={(event) => setNotifyAttendees(event.target.checked)}
                    />
                    Notify attendees
                  </label>
                </div>
              </Card>
            ) : null}

            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="event-title">Title</Label>
                <Input id="event-title" value={title} onChange={(event) => setTitle(event.target.value)} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="event-capacity">Capacity</Label>
                <Input
                  id="event-capacity"
                  value={capacity}
                  onChange={(event) => setCapacity(event.target.value)}
                  placeholder="Optional"
                  inputMode="numeric"
                />
              </div>

              <DateTimePicker label="Start" value={start} onChange={setStart} />
              <DateTimePicker label="End" value={end} onChange={setEnd} />

              <div className="space-y-1.5">
                <Label htmlFor="event-engagement">Engagement type</Label>
                <Select value={engagementType} onValueChange={(value) => setEngagementType(value as "INDIVIDUAL" | "GROUP")}>
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
                <Label htmlFor="event-mode">Delivery mode</Label>
                <Select value={deliveryMode} onValueChange={(value) => setDeliveryMode(value as "ONLINE" | "IN_PERSON" | "HYBRID")}>
                  <SelectTrigger id="event-mode" className="w-full">
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
                <Input id="event-location" value={locationText} onChange={(event) => setLocationText(event.target.value)} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="event-meeting">Meeting URL</Label>
                <Input
                  id="event-meeting"
                  value={meetingUrl}
                  onChange={(event) => setMeetingUrl(event.target.value)}
                  placeholder="https://..."
                />
              </div>
            </div>

            <Button type="button" onClick={() => void onSave()} disabled={pending} className="mt-3" intent="primary">
              {pending ? "Saving..." : "Save changes"}
            </Button>
          </Card>

          <Card className="mt-4 p-4">
            <h2 className="type-title">Lifecycle actions</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {actions.publish ? (
                <Button intent="secondary" disabled={pending} onClick={() => void onAction(actions.publish!)}>
                  Publish
                </Button>
              ) : null}

              {actions.cancel ? (
                <Button
                  intent="danger"
                  disabled={pending}
                  onClick={() => void onAction(actions.cancel!, { reason: "Cancelled via admin console" })}
                >
                  Cancel
                </Button>
              ) : null}

              {!actions.publish && !actions.cancel ? (
                <p className="type-body-sm text-text-secondary">No lifecycle actions available in current state.</p>
              ) : null}
            </div>
          </Card>

          <Card className="mt-4 p-4">
            <h2 className="type-title">Instructor assignment</h2>
            <p className="mt-1 type-body-sm text-text-secondary">
              Current: {event.instructor_state}
              {event.instructor_name ? ` · ${event.instructor_name}` : " · TBA"}
            </p>

            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="instructor-state">Assignment state</Label>
                <Select
                  value={assignmentState}
                  onValueChange={(value) =>
                    setAssignmentState(value as "TBA" | "PROPOSED" | "ASSIGNED" | "CONFIRMED" | "REASSIGNED")
                  }
                >
                  <SelectTrigger id="instructor-state" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TBA">TBA</SelectItem>
                    <SelectItem value="PROPOSED">Proposed</SelectItem>
                    <SelectItem value="ASSIGNED">Assigned</SelectItem>
                    <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                    <SelectItem value="REASSIGNED">Reassigned</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="instructor-id">Instructor</Label>
                <Select value={assignmentInstructorId} onValueChange={setAssignmentInstructorId}>
                  <SelectTrigger id="instructor-id" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={UNASSIGNED_INSTRUCTOR_VALUE}>Unassigned</SelectItem>
                    {instructors.map((instructor) => (
                      <SelectItem key={instructor.id} value={instructor.id}>
                        {instructor.name} ({instructor.status})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="instructor-note">Transition note</Label>
                <Input
                  id="instructor-note"
                  value={assignmentNote}
                  onChange={(event) => setAssignmentNote(event.target.value)}
                  placeholder="Optional note"
                />
              </div>
            </div>

            <Button
              type="button"
              onClick={() => void onUpdateInstructorAssignment()}
              disabled={pending}
              className="mt-3"
              intent="secondary"
            >
              {pending ? "Updating..." : "Update assignment"}
            </Button>
          </Card>

          <Card className="mt-4 p-4">
            <h2 className="type-title">Related admin tools</h2>
            <div className="mt-2 flex gap-3 type-body-sm">
              <Link className="underline" href={`/admin/events/${event.slug}/registrations`}>
                Registrations
              </Link>
              <Link className="underline" href={`/admin/events/${event.slug}/export`}>
                Export
              </Link>
            </div>
          </Card>
        </>
      ) : null}
    </PageShell>
  );
}
