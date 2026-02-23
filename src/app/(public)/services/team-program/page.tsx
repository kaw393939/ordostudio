import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { Card } from "@/components/primitives";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Team Program \u2022 Training \u2022 Studio Ordo",
  description:
    "6-week Team Program: six capabilities, measurable growth, pre/post Team Readiness Assessment.",
  openGraph: {
    title: "Team Program \u2022 Training \u2022 Studio Ordo",
    description:
      "6-week Team Program: six capabilities, measurable growth, pre/post Team Readiness Assessment.",
  },
  alternates: {
    canonical: "/services/team-program",
  },
};

const weeks = [
  { week: 1, focus: "Foundation", capability: "Disciplined Inquiry", artifact: "Context Pack v1" },
  { week: 2, focus: "Judgment", capability: "Professional Judgment", artifact: "+ AI Audit Log" },
  { week: 3, focus: "Resilience", capability: "Resilience + Problem Finding", artifact: "+ Failure Mode Analysis" },
  { week: 4, focus: "Data & Systems", capability: "Epistemic Humility + Systems Thinking", artifact: "+ Data Assumptions + Agentic Workflow" },
  { week: 5, focus: "Leadership", capability: "Accountable Leadership", artifact: "+ Demo Day Recording" },
  { week: 6, focus: "Integration", capability: "Translation + Review", artifact: "+ Translation Brief + Complete Portfolio" },
] as const;

export default function TeamProgramPage() {
  return (
    <PageShell title="Team Program" subtitle="Six weeks. Six capabilities. Measurable growth.">
      {/* Overview */}
      <section className="surface p-6">
        <p className="type-body-sm text-text-secondary">
          The Team Program maps eight workshops into six weekly sessions. Each week focuses on one or two Human Edge
          capabilities, building on the previous week&apos;s artifacts. Pre/post Team Readiness Assessment provides
          quantitative evidence of improvement.
        </p>
      </section>

      {/* Week-by-week structure */}
      <section className="mt-6">
        <h2 className="type-title text-text-primary">Six-Week Structure</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {weeks.map((w) => (
            <Card key={w.week} className="p-4">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-muted type-meta text-text-primary">
                  {w.week}
                </span>
                <Badge variant="outline">{w.focus}</Badge>
              </div>
              <p className="mt-3 type-label text-text-primary">{w.capability}</p>
              <p className="mt-1 type-meta text-text-muted">{w.artifact}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Team Readiness Assessment */}
      <section className="mt-6 surface p-6">
        <h2 className="type-title text-text-primary">Team Readiness Assessment</h2>
        <p className="mt-2 type-body-sm text-text-secondary">
          A 32-point assessment (4 points &times; 8 capabilities) administered before Week 1 and after Week 6. Provides
          a quantitative before/after that you can report to leadership.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[
            { level: 0, label: "No awareness of the capability" },
            { level: 1, label: "Can describe the capability" },
            { level: 2, label: "Can demonstrate with support" },
            { level: 3, label: "Can demonstrate independently" },
            { level: 4, label: "Can teach the capability to others" },
          ].map((l) => (
            <div key={l.level} className="surface-elevated p-3 text-center">
              <span className="type-title text-text-primary">{l.level}</span>
              <p className="mt-1 type-meta text-text-secondary">{l.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* What you leave with */}
      <section className="mt-6 surface p-6">
        <h2 className="type-title text-text-primary">What you leave with</h2>
        <ul className="mt-3 list-disc space-y-1 pl-5 type-body-sm text-text-secondary">
          <li>Complete artifact portfolio (Context Pack, AI Audit Log, Failure Mode Analysis, Data Assumptions Document, Agentic Workflow, Demo Day Recording, Translation Brief)</li>
          <li>Pre/post Team Readiness Assessment scores</li>
          <li>Individual capability profiles for each team member</li>
          <li>Recommended next steps for continued development</li>
        </ul>
      </section>

      {/* Who This Is For */}
      <section className="mt-6 surface p-6">
        <h2 className="type-title text-text-primary">Who this is for</h2>
        <p className="mt-2 type-body-sm text-text-secondary">
          Teams of 6&ndash;20 engineers who need structured AI capability development with measurable outcomes. Ideal
          for organizations preparing for AI-integrated delivery, responding to compliance requirements around AI
          decision-making, or investing in retention through professional development.
        </p>
      </section>

      {/* Pricing */}
      <section className="mt-6 surface p-6">
        <h2 className="type-title text-text-primary">Pricing</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full type-body-sm">
            <thead>
              <tr className="border-b border-border-default">
                <th className="pb-2 text-left type-label text-text-primary">Format</th>
                <th className="pb-2 text-left type-label text-text-primary">Price</th>
              </tr>
            </thead>
            <tbody className="text-text-secondary">
              <tr className="border-b border-border-default">
                <td className="py-2">Team Program (up to 12)</td>
                <td className="py-2">$18,000</td>
              </tr>
              <tr className="border-b border-border-default">
                <td className="py-2">Team Program (13&ndash;20)</td>
                <td className="py-2">$24,000</td>
              </tr>
              <tr>
                <td className="py-2">Additional assessment rounds</td>
                <td className="py-2">$2,000 per round</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* FAQ */}
      <section className="mt-6 surface p-6">
        <h2 className="type-title text-text-primary">FAQ</h2>
        <div className="mt-4 space-y-4">
          <div>
            <p className="type-label text-text-primary">Six weeks feels fast. Can we go slower?</p>
            <p className="mt-1 type-body-sm text-text-secondary">
              Yes. We offer 8-week and 12-week cadences for the same curriculum. The content doesn&apos;t change &mdash;
              the spacing does.
            </p>
          </div>
          <div>
            <p className="type-label text-text-primary">Do participants need prior AI experience?</p>
            <p className="mt-1 type-body-sm text-text-secondary">
              No. The program starts from first principles. The MIT research shows the biggest gains come from the
              least-experienced participants.
            </p>
          </div>
          <div>
            <p className="type-label text-text-primary">Can we run this for multiple teams?</p>
            <p className="mt-1 type-body-sm text-text-secondary">
              Yes. We offer multi-team pricing and can run cohorts in parallel with a shared capstone session.
            </p>
          </div>
        </div>
      </section>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Link
          href="/services/request?offer=team-program"
          className="motion-base rounded-sm border border-action-primary bg-action-primary px-3 py-2 type-label text-text-inverse hover:bg-action-primary-hover"
        >
          Book a technical consult
        </Link>
        <Link href="/services" className="type-label underline">
          Back to training
        </Link>
      </div>
    </PageShell>
  );
}
