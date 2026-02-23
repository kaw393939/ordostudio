"use client";

import { useState } from "react";
import Link from "next/link";
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

      <div className="mt-6 mb-8 grid gap-8 md:grid-cols-2">
        <div className="surface p-6 rounded-lg border border-border-subtle">
          <h2 className="type-title text-text-primary mb-4">The Signal</h2>
          <p className="type-body-sm text-text-secondary mb-4">
            We synthesize our field work, event outcomes, and community field reports into a single, high-signal dispatch.
          </p>
          <ul className="space-y-3 type-body-sm text-text-secondary list-disc list-inside mb-6">
            <li><strong>Field Notes:</strong> Real observations from our work with enterprise teams.</li>
            <li><strong>Artifacts:</strong> Templates, prompts, and frameworks you can use immediately.</li>
            <li><strong>Analysis:</strong> Signal-over-noise commentary on model updates.</li>
          </ul>
          <Link
            href="/studio/report"
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-border-subtle bg-surface hover:bg-surface-hover text-text-primary px-4 py-2"
          >
            Submit a Field Report
          </Link>
        </div>

        <div className="surface-elevated p-6 rounded-lg border border-border-subtle">
          <h3 className="type-label text-text-muted mb-2 uppercase tracking-wider">Sample Dispatch</h3>
          <h4 className="type-title text-text-primary mb-2">The Context Pack Advantage</h4>
          <div className="type-body-sm text-text-secondary space-y-4 italic border-l-2 border-border-subtle pl-4">
            <p>
              "This week in the field, we noticed a recurring pattern: teams struggling with LLM hallucinations weren't failing at prompting—they were failing at context management.
            </p>
            <p>
              By implementing a standardized 'Context Pack' (a structured markdown file containing domain-specific rules and constraints), one engineering team reduced their QA cycles by 40%."
            </p>
          </div>
          <div className="mt-4 pt-4 border-t border-border-subtle">
            <p className="type-meta text-text-muted">
              Includes: 1 Framework, 2 Field Reports, 3 Links.
            </p>
          </div>
        </div>
      </div>

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
