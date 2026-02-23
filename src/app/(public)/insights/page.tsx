import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { Card } from "@/components/primitives";

export const metadata: Metadata = {
  title: "Insights \u2022 Studio Ordo",
  description:
    "Frameworks, briefings, and methods from Studio Ordo. The Human Edge, Spell Book, Context Pack, and more.",
  openGraph: {
    title: "Insights \u2022 Studio Ordo",
    description:
      "Frameworks, briefings, and methods from Studio Ordo. The Human Edge, Spell Book, Context Pack, and more.",
  },
  alternates: {
    canonical: "/insights",
  },
};

const frameworks = [
  {
    name: "The Human Edge",
    description: "Eight capabilities AI cannot replicate. The hard skills of the AI era.",
    capabilities: "Disciplined Inquiry, Professional Judgment, Resilience Thinking, Problem Finding, Epistemic Humility, Systems Thinking, Accountable Leadership, Translation",
  },
  {
    name: "The Spell Book",
    description: "60+ professional terms that create precision and shared vocabulary across teams.",
    capabilities: "Context Pack, AI Audit Log, Failure Mode Analysis, Agentic Workflow, Translation Brief, and 55+ more",
  },
  {
    name: "The Context Pack",
    description: "The meta-skill of the AI era. A structured document that gives AI agents the context they need to produce reliable output.",
    capabilities: "Project brief, domain context, evaluation criteria, prior context chain",
  },
  {
    name: "The AI Audit Log",
    description: "A decision trail documenting every accept, reject, and modify decision when working with AI. Accountability made visible.",
    capabilities: "Decision type, reasoning, quality assessment, timestamp",
  },
  {
    name: "The 40/60 Method",
    description: "40% manual work builds judgment. 60% AI-assisted work builds velocity. 100% produces artifacts that prove how you work.",
    capabilities: "Adjustable ratio by experience level: 70/30 (beginner) to 20/80 (maestro)",
  },
] as const;

const dataPoints = [
  { stat: "+40%", label: "Faster task completion", source: "MIT RCT" },
  { stat: "+18%", label: "Higher quality output", source: "MIT RCT" },
  { stat: "48%", label: "AI projects reach production", source: "Industry benchmark" },
  { stat: "+68%", label: "AI-skill job posting growth", source: "UMD Smith School" },
  { stat: "$184K+", label: "Median AI engineer salary (NYC/NJ)", source: "Glassdoor 2025" },
  { stat: "3\u20134 mo.", label: "AI capability doubling time", source: "METR, Feb 2026" },
] as const;

export default function InsightsPage() {
  return (
    <PageShell title="Insights" subtitle="Frameworks, data, and methods \u2014 published with provenance.">
      {/* Frameworks Section */}
      <section>
        <h2 className="type-title text-text-primary">Frameworks</h2>
        <p className="mt-1 type-body-sm text-text-secondary">
          The intellectual tools that power every Studio Ordo engagement. Each framework is battle-tested across 23
          years of teaching and thousands of engineers.
        </p>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {frameworks.map((fw) => (
            <Card key={fw.name} className="p-5">
              <h3 className="type-label text-text-primary">{fw.name}</h3>
              <p className="mt-2 type-body-sm text-text-secondary">{fw.description}</p>
              <p className="mt-2 type-meta text-text-muted">{fw.capabilities}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Data Points */}
      <section className="mt-6">
        <h2 className="type-title text-text-primary">The Data</h2>
        <p className="mt-1 type-body-sm text-text-secondary">
          Evidence we cite. Sources we verify. No hype.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {dataPoints.map((dp) => (
            <div key={dp.label} className="surface-elevated p-4 text-center">
              <p className="type-title text-text-primary">{dp.stat}</p>
              <p className="mt-1 type-label text-text-secondary">{dp.label}</p>
              <p className="mt-1 type-meta text-text-muted">{dp.source}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Lead Magnets Preview */}
      <section className="mt-6 grid gap-3 lg:grid-cols-3">
        <Card className="p-5">
          <h3 className="type-label text-text-primary">Spell Book PDF</h3>
          <p className="mt-2 type-body-sm text-text-secondary">
            40 professional terms with definitions, categories, and usage examples. The vocabulary that separates
            AI-capable engineers from everyone else.
          </p>
          <p className="mt-3 type-meta text-text-muted">Free download &mdash; coming soon</p>
        </Card>
        <Card className="p-5">
          <h3 className="type-label text-text-primary">Context Pack Starter Kit</h3>
          <p className="mt-2 type-body-sm text-text-secondary">
            A blank Context Pack template with instructions, examples, and a checklist. Start structuring your AI
            interactions immediately.
          </p>
          <p className="mt-3 type-meta text-text-muted">Free download &mdash; coming soon</p>
        </Card>
        <Card className="p-5">
          <h3 className="type-label text-text-primary">Human Edge Scorecard</h3>
          <p className="mt-2 type-body-sm text-text-secondary">
            Self-assessment across all 8 Human Edge capabilities. Score yourself, identify gaps, and get a recommended
            starting point.
          </p>
          <p className="mt-3 type-meta text-text-muted">Free assessment &mdash; coming soon</p>
        </Card>
      </section>

      {/* Ordo Brief */}
      <section className="mt-6 surface-elevated p-6 text-center">
        <h2 className="type-title text-text-primary">The Ordo Brief</h2>
        <p className="mt-2 type-body-sm text-text-secondary">
          Weekly AI capability data, salary insights, and practical frameworks. Every issue follows the same structure:
          Models, Money, People, From the Field, Next Steps. No hype. Sourced and cited.
        </p>
        <div className="mt-4">
          <Link href="/newsletter" className="type-label underline">
            Subscribe &rarr;
          </Link>
        </div>
      </section>

      {/* Page CTA */}
      <section className="mt-6 text-center">
        <p className="type-body-sm text-text-secondary">
          Want to go deeper? Our training tracks put these frameworks into practice.
        </p>
        <div className="mt-3">
          <Link
            href="/services"
            className="motion-base rounded-sm border border-action-primary bg-action-primary px-3 py-2 type-label text-text-inverse hover:bg-action-primary-hover"
          >
            View training tracks
          </Link>
        </div>
      </section>
    </PageShell>
  );
}
