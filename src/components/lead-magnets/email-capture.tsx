"use client";

import { useState } from "react";
import { Button, Card } from "@/components/primitives";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ProblemDetailsPanel } from "@/components/problem-details";
import { requestHal, type ProblemDetails } from "@/lib/hal-client";
import { emitMeasurementEvent } from "@/lib/measurement-client";

type EmailCaptureProps = {
  /** Which lead magnet is gating this capture */
  source: "spell-book" | "context-pack" | "assessment";
  /** Shown before user submits */
  headline: string;
  /** Short description below the headline */
  description: string;
  /** Label for the CTA button */
  ctaLabel?: string;
  /** Called after successful capture with the email address */
  onSuccess?: (email: string) => void;
  /** The path for measurement events */
  pagePath: string;
};

export function EmailCapture({
  source,
  headline,
  description,
  ctaLabel = "Get it free",
  onSuccess,
  pagePath,
}: EmailCaptureProps) {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [problem, setProblem] = useState<ProblemDetails | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const onSubmit = async () => {
    if (!email.trim()) return;
    setPending(true);
    setProblem(null);

    void emitMeasurementEvent({
      key: "EMAIL_CAPTURE",
      path: pagePath,
      metadata: { source },
    });

    const result = await requestHal<{ ok: true }>("/api/v1/newsletter/subscribe", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email }),
    });

    if (!result.ok) {
      setProblem(result.problem);
      setPending(false);
      return;
    }

    void emitMeasurementEvent({
      key: "LEAD_MAGNET_DOWNLOAD",
      path: pagePath,
      metadata: { source },
    });

    setSubmitted(true);
    setPending(false);
    onSuccess?.(email);
  };

  return (
    <Card className="p-5">
      {problem ? (
        <div className="mb-4">
          <ProblemDetailsPanel problem={problem} />
        </div>
      ) : null}

      <h3 className="type-title text-text-primary">{headline}</h3>
      <p className="mt-1 type-body-sm text-text-secondary">{description}</p>

      {submitted ? (
        <div className="mt-4 rounded-sm border border-border-default bg-state-success/10 p-4">
          <p className="type-label text-text-primary">You&apos;re in.</p>
          <p className="mt-1 type-meta text-text-secondary">
            Check your inbox. You&apos;ve also been added to the Ordo Brief — our short newsletter on models, money, and people. Unsubscribe anytime.
          </p>
        </div>
      ) : (
        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
          <div className="space-y-1.5">
            <Label htmlFor={`capture-email-${source}`}>Email</Label>
            <Input
              id={`capture-email-${source}`}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              inputMode="email"
              autoComplete="email"
              onKeyDown={(e) => {
                if (e.key === "Enter") void onSubmit();
              }}
            />
          </div>
          <Button intent="primary" onClick={() => void onSubmit()} disabled={pending}>
            {pending ? "Sending…" : ctaLabel}
          </Button>
        </div>
      )}

      <p className="mt-3 type-meta text-text-muted">
        No spam. No countdown timers. Unsubscribe in one click.
      </p>
    </Card>
  );
}
