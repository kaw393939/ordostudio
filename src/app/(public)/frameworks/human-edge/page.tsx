"use client";

import { useState } from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { Card } from "@/components/primitives";

const capabilities = [
  {
    id: 1,
    name: "Disciplined Inquiry",
    definition:
      "The ability to ask questions that matter \u2014 to decompose ambiguity into structured investigation.",
    whyAICant:
      "AI answers questions but can\u2019t tell you if you\u2019re asking the right one.",
    workshop: "Workshop 1: Ask Better Questions",
    icon: "\ud83d\udd0d",
  },
  {
    id: 2,
    name: "Professional Judgment",
    definition:
      "The ability to evaluate work \u2014 your own, your team\u2019s, your AI\u2019s \u2014 and know when to accept, reject, or modify.",
    whyAICant:
      "AI generates output with uniform confidence \u2014 it doesn\u2019t know when it\u2019s wrong.",
    workshop: "Workshop 2: AI Accountability in Practice",
    icon: "\u2696\ufe0f",
  },
  {
    id: 3,
    name: "Resilience Thinking",
    definition:
      "The ability to design for failure, respond when things break, and own recovery.",
    whyAICant:
      "AI can monitor metrics but can\u2019t make the 2 AM judgment call about rollback.",
    workshop: "Workshop 3: Design for Failure",
    icon: "\ud83d\udee1\ufe0f",
  },
  {
    id: 4,
    name: "Problem Finding",
    definition:
      "The ability to identify the real problem in a complex human system \u2014 not the stated problem, not the obvious problem, but the one that actually matters.",
    whyAICant:
      "AI can analyze data about organizations but can\u2019t sense political dynamics or read between lines.",
    workshop: "Workshop 4: Find the Right Problem",
    icon: "\ud83c\udfaf",
  },
  {
    id: 5,
    name: "Epistemic Humility",
    definition:
      "The understanding that data is not truth \u2014 it is a model of truth, with assumptions, biases, and blind spots.",
    whyAICant:
      "AI treats training data as ground truth \u2014 no mechanism for recognizing what\u2019s not in the data.",
    workshop: "Workshop 5: Data Architecture for AI",
    icon: "\ud83e\udde0",
  },
  {
    id: 6,
    name: "Systems Thinking",
    definition:
      "The ability to decompose complex systems, understand interdependencies, and design for the whole \u2014 not just the parts.",
    whyAICant:
      "AI can analyze individual components but can\u2019t reason about emergent behavior across a whole system.",
    workshop: "Workshop 6: Systems-Level AI Architecture",
    icon: "\ud83d\udd17",
  },
  {
    id: 7,
    name: "Accountable Leadership",
    definition:
      "The ability to ship a system, present it to stakeholders, defend its design, own its failures, and plan its improvement.",
    whyAICant:
      "AI cannot be held accountable \u2014 someone must face the client and own failures.",
    workshop: "Workshop 7: Ship & Present",
    icon: "\ud83d\ude80",
  },
  {
    id: 8,
    name: "Translation",
    definition:
      "The ability to make complex, invisible things tangible \u2014 turning data, logic, and system behavior into something humans can see, interact with, and understand.",
    whyAICant:
      "AI can generate text but can\u2019t judge whether a human actually understands.",
    workshop: "Workshop 8: Teach AI to Your Team",
    icon: "\ud83d\udde3\ufe0f",
  },
];

export default function HumanEdgePage() {
  const [selected, setSelected] = useState<number | null>(null);
  const active = capabilities.find((c) => c.id === selected) ?? null;

  return (
    <PageShell
      title="The Human Edge"
      subtitle="Eight capabilities that AI cannot replace \u2014 the skills that determine whether you direct the machine or the machine directs you."
      breadcrumbs={[
        { label: "Frameworks", href: "/frameworks" },
        { label: "Human Edge" },
      ]}
    >
      {/* Capability grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {capabilities.map((cap) => (
          <button
            key={cap.id}
            type="button"
            onClick={() => setSelected(cap.id === selected ? null : cap.id)}
            className={`text-left rounded-lg border p-3 transition-all ${
              cap.id === selected
                ? "border-action-primary bg-action-primary/5 ring-2 ring-action-primary/30"
                : "border-border-default hover:border-action-primary/40"
            }`}
          >
            <span className="text-2xl">{cap.icon}</span>
            <h3 className="mt-1 type-label">{cap.name}</h3>
            <p className="mt-0.5 type-meta text-text-muted line-clamp-2">
              {cap.definition}
            </p>
          </button>
        ))}
      </div>

      {/* Selected capability detail */}
      {active ? (
        <Card className="mt-4 p-4 animate-in fade-in duration-200">
          <div className="flex items-start gap-3">
            <span className="text-3xl">{active.icon}</span>
            <div className="flex-1">
              <h2 className="type-title">{active.name}</h2>
              <p className="mt-1 type-body-sm text-text-secondary">
                {active.definition}
              </p>
              <div className="mt-3 rounded-md bg-state-danger/10 p-3">
                <p className="type-label text-state-danger">Why AI can&apos;t do this</p>
                <p className="mt-1 type-body-sm text-text-secondary">
                  {active.whyAICant}
                </p>
              </div>
              <div className="mt-3 rounded-md bg-state-info/10 p-3">
                <p className="type-label text-state-info">Developed in</p>
                <p className="mt-1 type-body-sm text-text-secondary">
                  {active.workshop}
                </p>
              </div>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="mt-4 p-4">
          <p className="type-body-sm text-text-muted text-center">
            Select a capability above to see why AI can&apos;t replace it and which workshop develops it.
          </p>
        </Card>
      )}

      {/* Scoring guide */}
      <Card className="mt-4 p-4">
        <h2 className="type-title">Team Readiness Assessment</h2>
        <p className="mt-1 type-body-sm text-text-secondary">
          Score your team on each capability (1\u20134). Maximum score: 32.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { range: "25\u201332", label: "Advisory", desc: "High readiness \u2014 advisory engagement" },
            { range: "17\u201324", label: "Team Program", desc: "Strong foundation \u2014 team program" },
            { range: "9\u201316", label: "Workshop Series", desc: "Developing \u2014 workshop series + team program" },
            { range: "1\u20138", label: "Full Studio Track", desc: "Beginning \u2014 full studio track" },
          ].map((level) => (
            <div
              key={level.range}
              className="rounded-md border border-border-default p-3"
            >
              <p className="type-label">{level.range}</p>
              <p className="type-meta font-medium text-text-primary">
                {level.label}
              </p>
              <p className="type-meta text-text-muted">{level.desc}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* CTA */}
      <Card className="mt-4 p-4 text-center">
        <p className="type-body-sm text-text-secondary">
          Want to measure your team&apos;s Human Edge?
        </p>
        <Link
          href="/resources/assessment"
          className="mt-2 inline-block rounded-md bg-action-primary px-4 py-2 type-label text-text-inverse"
        >
          Take the Human Edge Scorecard \u2192
        </Link>
      </Card>
    </PageShell>
  );
}
