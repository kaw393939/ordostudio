"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { PageShell } from "@/components/layout/page-shell";
import { Button, Card } from "@/components/primitives";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProblemDetailsPanel } from "@/components/problem-details";
import { requestHal, type ProblemDetails } from "@/lib/hal-client";

type EventItem = {
  slug: string;
  title: string;
  status: string;
};

type EventsResponse = {
  items: EventItem[];
};

type FieldReportResponse = {
  id: string;
  event_slug: string;
  event_title: string;
  created_at: string;
};

type FieldErrors = Partial<{
  eventSlug: string;
  keyInsights: string;
  models: string;
  money: string;
  people: string;
  whatITried: string;
  clientAdvice: string;
}>;

export default function StudioReportPageClient() {
  const searchParams = useSearchParams();
  const initialEventSlug = searchParams.get("event") ?? "";

  const [events, setEvents] = useState<EventItem[]>([]);
  const [eventsPending, setEventsPending] = useState(true);

  const [eventSlug, setEventSlug] = useState(initialEventSlug);
  const [keyInsights, setKeyInsights] = useState("");
  const [models, setModels] = useState("");
  const [money, setMoney] = useState("");
  const [people, setPeople] = useState("");
  const [whatITried, setWhatITried] = useState("");
  const [clientAdvice, setClientAdvice] = useState("");

  const [pending, setPending] = useState(false);
  const [problem, setProblem] = useState<ProblemDetails | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitted, setSubmitted] = useState<FieldReportResponse | null>(null);

  const eventsHref = useMemo(() => {
    const query = new URLSearchParams({ status: "PUBLISHED", limit: "20", offset: "0" });
    return `/api/v1/events?${query.toString()}`;
  }, []);

  useEffect(() => {
    let alive = true;

    void (async () => {
      const result = await requestHal<EventsResponse>(eventsHref);
      if (!alive) return;

      if (!result.ok) {
        setProblem(result.problem);
        setEvents([]);
        setEventsPending(false);
        return;
      }

      setEvents(result.data.items ?? []);
      setEventsPending(false);
    })();

    return () => {
      alive = false;
    };
  }, [eventsHref]);

  const validate = (): FieldErrors => {
    const errors: FieldErrors = {};
    if (eventSlug.trim().length === 0) errors.eventSlug = "Event is required.";
    if (keyInsights.trim().length === 0) errors.keyInsights = "Key insights are required.";
    if (models.trim().length === 0) errors.models = "Models is required.";
    if (money.trim().length === 0) errors.money = "Money is required.";
    if (people.trim().length === 0) errors.people = "People is required.";
    if (whatITried.trim().length === 0) errors.whatITried = "What you tried is required.";
    if (clientAdvice.trim().length === 0) errors.clientAdvice = "Client advice is required.";
    return errors;
  };

  const onSubmit = async () => {
    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setPending(true);
    setProblem(null);
    setFieldErrors({});

    const result = await requestHal<FieldReportResponse>("/api/v1/account/field-reports", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        event_slug: eventSlug.trim(),
        key_insights: keyInsights,
        models,
        money,
        people,
        what_i_tried: whatITried,
        client_advice: clientAdvice,
      }),
    });

    if (!result.ok) {
      setProblem(result.problem);
      setPending(false);
      return;
    }

    setSubmitted(result.data);
    setPending(false);
  };

  if (submitted) {
    return (
      <PageShell title="Report submitted" subtitle="Thank you — your mentor review begins next.">
        <Card className="p-4">
          <p className="type-label text-text-primary">What happens next</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 type-body-sm text-text-secondary">
            <li>We review for clarity and concrete recommendations.</li>
            <li>Strong reports may be featured and used in the newsletter.</li>
          </ul>
          <p className="mt-3 type-meta text-text-muted">Reference ID: {submitted.id}</p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Link href="/studio" className="type-label underline">
              Back to Studio
            </Link>
            <Link href="/events" className="type-label underline">
              Browse events
            </Link>
          </div>
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell title="Submit field report" subtitle="Structured notes after attending an event — built for mentor review.">
      <Card className="p-4">
        <h2 className="type-title">Field report</h2>
        <p className="mt-1 type-body-sm text-text-secondary">Keep it specific. Avoid generic adjectives without evidence.</p>

        <div className="mt-3 space-y-1.5">
          <Label htmlFor="report-event">Event</Label>
          <Select
            value={eventSlug}
            onValueChange={(value) => {
              setEventSlug(value);
              setFieldErrors((prev) => ({ ...prev, eventSlug: undefined }));
            }}
          >
            <SelectTrigger id="report-event" className="w-full" aria-invalid={fieldErrors.eventSlug ? true : undefined}>
              <SelectValue placeholder={eventsPending ? "Loading events…" : "Select an event"} />
            </SelectTrigger>
            <SelectContent>
              {events.map((event) => (
                <SelectItem key={event.slug} value={event.slug}>
                  {event.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {fieldErrors.eventSlug ? <p className="type-meta text-state-danger">{fieldErrors.eventSlug}</p> : null}
          <p className="type-meta text-text-muted">Tip: pick a recommended event from the Studio page.</p>
        </div>

        <div className="mt-4 space-y-1.5">
          <Label htmlFor="report-insights">Key insights</Label>
          <Textarea
            id="report-insights"
            value={keyInsights}
            onChange={(event) => {
              setKeyInsights(event.target.value);
              setFieldErrors((prev) => ({ ...prev, keyInsights: undefined }));
            }}
            className="min-h-24"
            aria-invalid={fieldErrors.keyInsights ? true : undefined}
          />
          {fieldErrors.keyInsights ? <p className="type-meta text-state-danger">{fieldErrors.keyInsights}</p> : null}
          <p className="type-meta text-text-muted">Example: “Teams underestimate eval. Shipping without a harness creates rework.”</p>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="report-models">Models</Label>
            <Textarea
              id="report-models"
              value={models}
              onChange={(event) => {
                setModels(event.target.value);
                setFieldErrors((prev) => ({ ...prev, models: undefined }));
              }}
              className="min-h-24"
              aria-invalid={fieldErrors.models ? true : undefined}
            />
            {fieldErrors.models ? <p className="type-meta text-state-danger">{fieldErrors.models}</p> : null}
            <p className="type-meta text-text-muted">What models/tools were discussed? What worked?</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="report-money">Money</Label>
            <Textarea
              id="report-money"
              value={money}
              onChange={(event) => {
                setMoney(event.target.value);
                setFieldErrors((prev) => ({ ...prev, money: undefined }));
              }}
              className="min-h-24"
              aria-invalid={fieldErrors.money ? true : undefined}
            />
            {fieldErrors.money ? <p className="type-meta text-state-danger">{fieldErrors.money}</p> : null}
            <p className="type-meta text-text-muted">What changed in pricing, budgets, or ROI thinking?</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="report-people">People</Label>
            <Textarea
              id="report-people"
              value={people}
              onChange={(event) => {
                setPeople(event.target.value);
                setFieldErrors((prev) => ({ ...prev, people: undefined }));
              }}
              className="min-h-24"
              aria-invalid={fieldErrors.people ? true : undefined}
            />
            {fieldErrors.people ? <p className="type-meta text-state-danger">{fieldErrors.people}</p> : null}
            <p className="type-meta text-text-muted">What roles, incentives, or adoption blockers showed up?</p>
          </div>
        </div>

        <div className="mt-4 space-y-1.5">
          <Label htmlFor="report-tried">What I tried</Label>
          <Textarea
            id="report-tried"
            value={whatITried}
            onChange={(event) => {
              setWhatITried(event.target.value);
              setFieldErrors((prev) => ({ ...prev, whatITried: undefined }));
            }}
            className="min-h-24"
            aria-invalid={fieldErrors.whatITried ? true : undefined}
          />
          {fieldErrors.whatITried ? <p className="type-meta text-state-danger">{fieldErrors.whatITried}</p> : null}
          <p className="type-meta text-text-muted">Example: “I ran the eval checklist on an existing PR flow and found gaps.”</p>
        </div>

        <div className="mt-4 space-y-1.5">
          <Label htmlFor="report-advice">What I’d advise a client</Label>
          <Textarea
            id="report-advice"
            value={clientAdvice}
            onChange={(event) => {
              setClientAdvice(event.target.value);
              setFieldErrors((prev) => ({ ...prev, clientAdvice: undefined }));
            }}
            className="min-h-24"
            aria-invalid={fieldErrors.clientAdvice ? true : undefined}
          />
          {fieldErrors.clientAdvice ? <p className="type-meta text-state-danger">{fieldErrors.clientAdvice}</p> : null}
          <p className="type-meta text-text-muted">Be concrete: “Do X, measure Y, stop doing Z.”</p>
        </div>

        <Button intent="primary" className="mt-4" onClick={() => void onSubmit()} disabled={pending}>
          {pending ? "Submitting…" : "Submit report"}
        </Button>

        {problem ? (
          <div className="mt-4">
            <ProblemDetailsPanel problem={problem} />
            {problem.status === 401 ? (
              <div className="mt-2">
                <Link href="/login" className="type-label underline">
                  Login to submit
                </Link>
              </div>
            ) : null}
          </div>
        ) : null}
      </Card>
    </PageShell>
  );
}
