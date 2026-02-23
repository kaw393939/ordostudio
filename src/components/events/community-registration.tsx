"use client";

import { useState } from "react";
import { Button, Card } from "@/components/primitives";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ProblemDetailsPanel } from "@/components/problem-details";
import { requestHal, type ProblemDetails } from "@/lib/hal-client";
import { emitMeasurementEvent } from "@/lib/measurement-client";

type CommunityRegistrationProps = {
  /** The event slug for the registration API */
  eventSlug: string;
  /** Event title for confirmation display */
  eventTitle: string;
  /** Whether to show a newsletter opt-in checkbox */
  showNewsletterOptIn?: boolean;
};

export function CommunityRegistration({
  eventSlug,
  eventTitle,
  showNewsletterOptIn = true,
}: CommunityRegistrationProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [organization, setOrganization] = useState("");
  const [newsletterOptIn, setNewsletterOptIn] = useState(true);
  const [pending, setPending] = useState(false);
  const [problem, setProblem] = useState<ProblemDetails | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const onSubmit = async () => {
    if (!name.trim() || !email.trim()) return;
    setPending(true);
    setProblem(null);

    void emitMeasurementEvent({
      key: "COMMUNITY_EVENT_REGISTER",
      path: `/events/${eventSlug}`,
      metadata: { eventSlug, source: "community-registration" },
    });

    // Register via email-based registration (existing API supports user_email)
    const result = await requestHal<{ ok: true }>(`/api/v1/events/${eventSlug}/registrations`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        user_email: email,
        display_name: name,
        organization: organization || undefined,
      }),
    });

    if (!result.ok) {
      setProblem(result.problem);
      setPending(false);
      return;
    }

    // Optionally subscribe to newsletter
    if (newsletterOptIn && showNewsletterOptIn) {
      void requestHal("/api/v1/newsletter/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });

      void emitMeasurementEvent({
        key: "NEWSLETTER_SUBSCRIBE",
        path: `/events/${eventSlug}`,
        metadata: { source: "community-event-registration" },
      });
    }

    setSubmitted(true);
    setPending(false);
  };

  if (submitted) {
    return (
      <Card className="p-5">
        <h3 className="type-title text-text-primary">You&apos;re registered</h3>
        <p className="mt-2 type-body-sm text-text-secondary">
          You&apos;re confirmed for <strong>{eventTitle}</strong>. Look for
          event details in your inbox at <strong>{email}</strong>.
        </p>
        {newsletterOptIn && showNewsletterOptIn ? (
          <p className="mt-2 type-meta text-text-muted">
            You&apos;ve also been added to the Ordo Brief newsletter. Unsubscribe anytime.
          </p>
        ) : null}
      </Card>
    );
  }

  return (
    <Card className="p-5">
      {problem ? (
        <div className="mb-4">
          <ProblemDetailsPanel problem={problem} />
        </div>
      ) : null}

      <h3 className="type-title text-text-primary">Register for free</h3>
      <p className="mt-1 type-meta text-text-muted">No account required. Just your name and email.</p>

      <div className="mt-4 space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="community-name">Name</Label>
          <Input
            id="community-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            autoComplete="name"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="community-email">Email</Label>
          <Input
            id="community-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            inputMode="email"
            autoComplete="email"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="community-org">Organization <span className="type-meta text-text-muted">(optional)</span></Label>
          <Input
            id="community-org"
            value={organization}
            onChange={(e) => setOrganization(e.target.value)}
            placeholder="Company or team"
            autoComplete="organization"
          />
        </div>

        {showNewsletterOptIn ? (
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={newsletterOptIn}
              onChange={(e) => setNewsletterOptIn(e.target.checked)}
              className="mt-1 rounded border-border-default"
            />
            <span className="type-meta text-text-secondary">
              Subscribe to the Ordo Brief — a short newsletter on models, money, people, and what to do next.
            </span>
          </label>
        ) : null}

        <Button intent="primary" onClick={() => void onSubmit()} disabled={pending} fullWidth>
          {pending ? "Registering…" : "Register — Free"}
        </Button>
      </div>
    </Card>
  );
}
