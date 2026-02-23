import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { Card } from "@/components/primitives";

export const metadata: Metadata = {
  title: "The Context Pack — Studio Ordo",
  description:
    "The 4-component model for assembling the right information before you direct an AI agent. The meta-skill of the AI era is context management.",
  openGraph: {
    title: "The Context Pack — Studio Ordo",
    description:
      "The 4-component model for assembling the right information before directing an AI agent.",
  },
};

const components = [
  {
    name: "Project Brief",
    contents: "Problem statement, constraints, success criteria, scope boundaries",
    purpose: "Tell the agent what to do and when to stop",
    icon: "\ud83d\udccb",
  },
  {
    name: "Domain Context",
    contents:
      "Key concepts, terminology, relationships, prior work, relevant standards",
    purpose:
      "Give the agent enough domain knowledge to produce relevant output",
    icon: "\ud83c\udf10",
  },
  {
    name: "Evaluation Criteria",
    contents:
      "How to judge whether output is good \u2014 acceptance tests, quality metrics, style guidelines",
    purpose: "Enable the human to exercise informed judgment",
    icon: "\u2705",
  },
  {
    name: "Prior Context",
    contents:
      "What has been tried, what worked, what failed, lessons from previous iterations",
    purpose: "Prevent the agent from repeating known mistakes",
    icon: "\ud83d\udcda",
  },
];

const levels = [
  {
    label: "Beginner",
    focus: "Project Brief only",
    description:
      "Start here. Write a clear problem statement and constraints before touching AI tools.",
  },
  {
    label: "Intermediate",
    focus: "Full 4-component pack",
    description:
      "Assemble all four components. Evaluation criteria are the forcing function for quality.",
  },
  {
    label: "Advanced",
    focus: "Multi-agent orchestration packs",
    description:
      "Coordinate multiple agents with dependency management, shared context, and handoff protocols.",
  },
];

const templateTypes = [
  { name: "Feature Implementation", description: "Building new functionality with clear acceptance criteria" },
  { name: "Investigation / Research", description: "Exploring unknowns with structured hypothesis testing" },
  { name: "Incident Response", description: "Diagnosing and resolving production issues under time pressure" },
];

export default function ContextPackPage() {
  return (
    <PageShell
      title="The Context Pack"
      subtitle="The meta-skill of the AI era is not studying \u2014 it is context management: assembling and transferring the right information to AI agents."
      breadcrumbs={[
        { label: "Frameworks", href: "/frameworks" },
        { label: "Context Pack" },
      ]}
    >
      {/* The 4-component model */}
      <Card className="p-4">
        <h2 className="type-title">The 4-Component Model</h2>
        <p className="mt-1 type-body-sm text-text-secondary">
          Every effective AI interaction starts with assembling context. Without it, you get plausible nonsense.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {components.map((comp) => (
            <div
              key={comp.name}
              className="rounded-lg border border-border-default p-3"
            >
              <div className="flex items-center gap-2">
                <span className="text-2xl">{comp.icon}</span>
                <h3 className="type-label">{comp.name}</h3>
              </div>
              <p className="mt-1 type-body-sm text-text-secondary">
                {comp.contents}
              </p>
              <p className="mt-2 type-meta text-text-muted italic">
                {comp.purpose}
              </p>
            </div>
          ))}
        </div>
      </Card>

      {/* Visual diagram */}
      <Card className="mt-4 p-4">
        <h2 className="type-title">How it works</h2>
        <div className="mt-3 font-mono type-body-sm text-text-secondary leading-relaxed text-center">
          <p>Project Brief + Domain Context</p>
          <p>\u2193</p>
          <p className="font-bold text-text-primary">Context Pack</p>
          <p>\u2193</p>
          <p>AI Agent receives structured input</p>
          <p>\u2193</p>
          <p>Evaluation Criteria + Prior Context</p>
          <p>\u2193</p>
          <p className="font-bold text-text-primary">Human evaluates output with informed judgment</p>
        </div>
      </Card>

      {/* Progression */}
      <Card className="mt-4 p-4">
        <h2 className="type-title">Progression</h2>
        <div className="mt-3 space-y-3">
          {levels.map((level, i) => (
            <div
              key={level.label}
              className="flex gap-3 rounded-lg border border-border-default p-3"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-action-primary/10 type-label text-action-primary">
                {i + 1}
              </div>
              <div>
                <p className="type-label">
                  {level.label}{" "}
                  <span className="font-normal text-text-muted">
                    \u2014 {level.focus}
                  </span>
                </p>
                <p className="mt-0.5 type-body-sm text-text-secondary">
                  {level.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Template types */}
      <Card className="mt-4 p-4">
        <h2 className="type-title">Template Types</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {templateTypes.map((tt) => (
            <div key={tt.name} className="rounded-lg border border-border-default p-3">
              <p className="type-label">{tt.name}</p>
              <p className="mt-1 type-meta text-text-muted">{tt.description}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* CTA */}
      <Card className="mt-4 p-4 text-center">
        <p className="type-body-sm text-text-secondary">
          Ready to build your first Context Pack?
        </p>
        <Link
          href="/resources/context-pack"
          className="mt-2 inline-block rounded-md bg-action-primary px-4 py-2 type-label text-text-inverse"
        >
          Download the template kit \u2192
        </Link>
      </Card>
    </PageShell>
  );
}
