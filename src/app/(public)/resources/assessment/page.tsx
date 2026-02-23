"use client";

import { useState } from "react";
import { PageShell } from "@/components/layout/page-shell";
import { Button, Card } from "@/components/primitives";
import { Badge } from "@/components/ui/badge";
import { EmailCapture } from "@/components/lead-magnets/email-capture";

type Capability = {
  name: string;
  question: string;
};

const capabilities: Capability[] = [
  {
    name: "Disciplined Inquiry",
    question:
      "Can you write a spec before writing code? Can you define what \u201cdone\u201d looks like before you start?",
  },
  {
    name: "Professional Judgment",
    question:
      "When AI generates code, can you evaluate whether it\u2019s correct, appropriate, and production-ready? Do you have a process for accept/reject/modify decisions?",
  },
  {
    name: "Resilience Thinking",
    question:
      "Can you write a Failure Mode Analysis? Do you design for what breaks, not just for what works?",
  },
  {
    name: "Problem Finding",
    question:
      "Can you investigate an unfamiliar domain systematically? Can you distinguish the stated problem from the real problem?",
  },
  {
    name: "Epistemic Humility",
    question:
      "Do you document data assumptions? Can you articulate what your models and data cannot represent?",
  },
  {
    name: "Systems Thinking",
    question:
      "Can you design multi-component systems with clear interfaces? Do you understand how parts interact in ways that create emergent behavior?",
  },
  {
    name: "Accountable Leadership",
    question:
      "Can you present and defend technical decisions under questioning? Do you ship \u2014 not \u201calmost done,\u201d but deployed and evaluated?",
  },
  {
    name: "Translation",
    question:
      "Can you explain complex technical concepts to non-technical audiences? Can you design learning experiences that manage cognitive load?",
  },
];

const scaleLabels: Record<number, string> = {
  0: "Not aware",
  1: "Can describe it",
  2: "Can demonstrate with support",
  3: "Can demonstrate independently",
  4: "Can teach it to others",
};

function getInterpretation(total: number): { range: string; recommendation: string } {
  if (total <= 8) {
    return {
      range: "Foundation stage",
      recommendation:
        "Start with the Spell Book and Context Pack basics. Workshops would accelerate specific capabilities.",
    };
  }
  if (total <= 16) {
    return {
      range: "Developing",
      recommendation:
        "Targeted workshops would accelerate your growth. Consider the half-day formats for your lowest-scoring capabilities.",
    };
  }
  if (total <= 24) {
    return {
      range: "Proficient",
      recommendation:
        "A team program or studio apprenticeship would advance your capabilities further. You\u2019re ready for structured advanced development.",
    };
  }
  return {
    range: "Advanced",
    recommendation:
      "Advisory engagement or maestro-level work is your next step. You have the foundation to lead AI capability development for others.",
  };
}

function AssessmentForm({ onComplete }: { onComplete: (scores: number[]) => void }) {
  const [scores, setScores] = useState<(number | null)[]>(
    Array.from({ length: capabilities.length }, () => null),
  );
  const [current, setCurrent] = useState(0);

  const allAnswered = scores.every((s) => s !== null);

  const setScore = (index: number, value: number) => {
    const next = [...scores];
    next[index] = value;
    setScores(next);
    if (index < capabilities.length - 1 && next[index + 1] === null) {
      setCurrent(index + 1);
    }
  };

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <span className="type-meta text-text-muted">
          {scores.filter((s) => s !== null).length} of {capabilities.length} answered
        </span>
        <div className="h-1.5 flex-1 rounded bg-surface-elevated">
          <div
            className="h-full rounded bg-action-primary transition-all"
            style={{ width: `${(scores.filter((s) => s !== null).length / capabilities.length) * 100}%` }}
          />
        </div>
      </div>

      {capabilities.map((cap, i) => (
        <Card
          key={cap.name}
          className={`mb-4 p-5 transition-opacity ${i !== current && scores[i] !== null ? "opacity-70" : ""}`}
        >
          <div className="flex items-start gap-3">
            <Badge variant="outline" className="mt-0.5 shrink-0">
              {i + 1}
            </Badge>
            <div className="flex-1">
              <h3 className="type-label text-text-primary">{cap.name}</h3>
              <p className="mt-1 type-body-sm text-text-secondary">{cap.question}</p>

              <div className="mt-4 grid grid-cols-5 gap-2">
                {[0, 1, 2, 3, 4].map((value) => (
                  <button
                    key={value}
                    onClick={() => setScore(i, value)}
                    className={`rounded-sm border px-2 py-2 text-center transition-colors ${
                      scores[i] === value
                        ? "border-action-primary bg-action-primary text-text-inverse"
                        : "border-border-default bg-transparent text-text-secondary hover:border-action-primary hover:text-text-primary"
                    }`}
                  >
                    <span className="type-label block">{value}</span>
                    <span className="type-meta block mt-0.5 leading-tight">{scaleLabels[value]}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Card>
      ))}

      {allAnswered ? (
        <div className="mt-6 text-center">
          <Button
            intent="primary"
            size="lg"
            onClick={() => onComplete(scores as number[])}
          >
            See my results
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function ResultsPanel({ scores }: { scores: number[] }) {
  const total = scores.reduce((sum, s) => sum + s, 0);
  const strongest = capabilities[scores.indexOf(Math.max(...scores))];
  const weakest = capabilities[scores.indexOf(Math.min(...scores))];
  const interpretation = getInterpretation(total);

  return (
    <div className="space-y-6">
      {/* Score */}
      <Card className="p-6 text-center">
        <p className="type-meta text-text-muted">Your Human Edge Score</p>
        <p className="mt-1 text-5xl font-bold text-text-primary">
          {total} <span className="type-title text-text-muted">/ 32</span>
        </p>
        <Badge variant="secondary" className="mt-2">{interpretation.range}</Badge>
      </Card>

      {/* Capability profile */}
      <Card className="p-5">
        <h3 className="type-title text-text-primary">Capability profile</h3>
        <div className="mt-4 space-y-3">
          {capabilities.map((cap, i) => (
            <div key={cap.name} className="flex items-center gap-3">
              <span className="w-40 shrink-0 type-meta text-text-secondary">{cap.name}</span>
              <div className="h-3 flex-1 rounded bg-surface-elevated">
                <div
                  className="h-full rounded bg-action-primary transition-all"
                  style={{ width: `${(scores[i]! / 4) * 100}%` }}
                />
              </div>
              <span className="w-6 text-right type-label text-text-primary">{scores[i]}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Key findings */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-4">
          <p className="type-meta text-text-muted">Strongest capability</p>
          <p className="mt-1 type-label text-text-primary">{strongest?.name}</p>
        </Card>
        <Card className="p-4">
          <p className="type-meta text-text-muted">Development priority</p>
          <p className="mt-1 type-label text-text-primary">{weakest?.name}</p>
        </Card>
      </div>

      {/* Recommendation */}
      <Card className="p-5">
        <h3 className="type-title text-text-primary">Recommended next step</h3>
        <p className="mt-2 type-body-sm text-text-secondary">{interpretation.recommendation}</p>
      </Card>
    </div>
  );
}

export default function AssessmentResourcePage() {
  const [scores, setScores] = useState<number[] | null>(null);
  const [emailCaptured, setEmailCaptured] = useState(false);

  return (
    <PageShell
      title="Human Edge Scorecard"
      subtitle="Rate your current capability across the 8 Human Edge dimensions. 5 minutes. Honest answers produce useful results."
      breadcrumbs={[{ label: "Resources", href: "/resources" }, { label: "Assessment" }]}
    >
      {/* Intro */}
      <section className="mt-4">
        <Card className="p-5">
          <p className="type-body-sm text-text-secondary">
            For each capability, rate yourself on a 5-point scale:
          </p>
          <div className="mt-3 grid grid-cols-5 gap-2">
            {Object.entries(scaleLabels).map(([value, label]) => (
              <div key={value} className="rounded-sm border border-border-default p-2 text-center">
                <span className="type-label block">{value}</span>
                <span className="type-meta block text-text-muted">{label}</span>
              </div>
            ))}
          </div>
        </Card>
      </section>

      {/* Assessment or results */}
      <section className="mt-8">
        {scores === null ? (
          <AssessmentForm onComplete={setScores} />
        ) : emailCaptured ? (
          <ResultsPanel scores={scores} />
        ) : (
          <div className="space-y-6">
            {/* Teaser */}
            <Card className="p-5 text-center">
              <p className="type-title text-text-primary">
                Your score: {scores.reduce((a, b) => a + b, 0)} / 32
              </p>
              <p className="mt-2 type-body-sm text-text-secondary">
                Enter your email to see your detailed capability profile, strongest skill, development priority,
                and personalized recommendation.
              </p>
            </Card>

            {/* Email gate */}
            <EmailCapture
              source="assessment"
              headline="See your full Human Edge profile"
              description="Enter your email to unlock your detailed results and get a personalized development recommendation."
              ctaLabel="Show my results"
              pagePath="/resources/assessment"
              onSuccess={() => setEmailCaptured(true)}
            />
          </div>
        )}
      </section>
    </PageShell>
  );
}
