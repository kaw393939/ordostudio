"use client";

import { useState } from "react";
import { PageShell } from "@/components/layout/page-shell";
import { Button, Card } from "@/components/primitives";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ProblemDetailsPanel } from "@/components/problem-details";
import { requestHal, type ProblemDetails } from "@/lib/hal-client";

export default function NewsletterSubscribePage() {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [problem, setProblem] = useState<ProblemDetails | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const onSubmit = async () => {
    setPending(true);
    setProblem(null);

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

    setSubmitted(true);
    setPending(false);
  };

  return (
    <PageShell title="Newsletter" subtitle="A short memo: models, money, people, what we saw in the field, and what to do next.">
      {problem ? (
        <div className="mt-4">
          <ProblemDetailsPanel problem={problem} />
        </div>
      ) : null}

      <Card className="mt-4 p-4">
        <h2 className="type-title">Subscribe</h2>
        <p className="mt-1 type-meta text-text-muted">No hype. One issue at a time. Unsubscribe anytime.</p>

        {submitted ? (
          <p className="mt-3 type-meta text-text-secondary">You’re subscribed.</p>
        ) : (
          <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
            <div className="space-y-1.5">
              <Label htmlFor="newsletter-email">Email</Label>
              <Input
                id="newsletter-email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@company.com"
                inputMode="email"
                autoComplete="email"
              />
            </div>

            <Button intent="primary" onClick={() => void onSubmit()} disabled={pending}>
              {pending ? "Subscribing…" : "Subscribe"}
            </Button>
          </div>
        )}
      </Card>
    </PageShell>
  );
}
