import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { Card } from "@/components/primitives";

export const metadata: Metadata = {
  title: "The 40/60 Method — Studio Ordo",
  description:
    "40% manual work builds judgment. 60% AI-directed work builds velocity. The ratio that produces engineers who can evaluate what the machine produces.",
  openGraph: {
    title: "The 40/60 Method — Studio Ordo",
    description:
      "40% manual builds judgment. 60% AI-directed builds velocity.",
  },
};

const teamStages = [
  {
    stage: "New to AI",
    ratio: "50 / 40 / 10",
    parts: "manual / AI / reflection",
    when: "Never worked with AI systematically; AI output quality consistently poor",
  },
  {
    stage: "Some experience",
    ratio: "40 / 60",
    parts: "manual / AI",
    when: "Basic AI tool familiarity but lacks systematic workflow",
  },
  {
    stage: "Experienced",
    ratio: "25 / 65 / 10",
    parts: "manual / AI / advanced eval",
    when: "Strong foundational skills and established AI workflows",
  },
];

const diagnosticQuestions = [
  "Can team members explain why AI output is correct or incorrect? (If no → increase the 40%)",
  "Does the team write Context Packs before starting AI work? (If no → introduce at 40/60)",
  "Does the team document AI decisions in an Audit Log? (If no → add 10% reflection)",
  "Can team members catch AI errors before production? (If not consistently → increase 40%)",
  "Is the team orchestrating multiple agents on complex projects? (If yes → 25/65/10)",
];

const apprenticeProgression = [
  { level: "Level 1 (Apprentice)", ratio: "50/50" },
  { level: "Level 2 (Journeyman)", ratio: "40/60" },
  { level: "Level 3 (Senior Journeyman)", ratio: "30/70" },
  { level: "Level 4 (Maestro Candidate)", ratio: "20/80" },
];

export default function FortySixtyPage() {
  return (
    <PageShell
      title="The 40/60 Method"
      subtitle="Enough manual work to build informed judgment, then practice the real workflow. The ratio is a dial, not a law."
      breadcrumbs={[
        { label: "Frameworks", href: "/frameworks" },
        { label: "40/60 Method" },
      ]}
    >
      {/* The ratio explained */}
      <Card className="p-4">
        <h2 className="type-title">The Ratio</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-border-default p-4">
            <div className="text-3xl font-bold text-action-primary">40%</div>
            <p className="mt-1 type-label">Manual Work</p>
            <p className="mt-1 type-body-sm text-text-secondary">
              Builds the judgment substrate: mental models, pattern recognition,
              debugging skill, credibility to evaluate AI output.
            </p>
          </div>
          <div className="rounded-lg border border-border-default p-4">
            <div className="text-3xl font-bold text-state-success">60%</div>
            <p className="mt-1 type-label">AI-Directed Work</p>
            <p className="mt-1 type-body-sm text-text-secondary">
              Practices the real professional workflow: context construction,
              output evaluation, iteration management, multi-agent orchestration,
              accountability.
            </p>
          </div>
        </div>
      </Card>

      {/* Practical example */}
      <Card className="mt-4 p-4">
        <h2 className="type-title">Practical Session (2 hours)</h2>
        <div className="mt-3 space-y-3">
          <div className="flex gap-3 rounded-lg border border-border-default p-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-action-primary/10 type-label text-action-primary">
              40%
            </div>
            <div>
              <p className="type-label">First 45 minutes &mdash; Manual</p>
              <p className="type-body-sm text-text-secondary">
                Write test suite manually, run tests, debug, build mental model
                of the problem space.
              </p>
            </div>
          </div>
          <div className="flex gap-3 rounded-lg border border-border-default p-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-state-success/10 type-label text-state-success">
              60%
            </div>
            <div>
              <p className="type-label">Next 75 minutes &mdash; AI-Directed</p>
              <p className="type-body-sm text-text-secondary">
                Construct Context Pack &rarr; direct AI agent &rarr; evaluate
                output against your tests &rarr; document in Audit Log &rarr;
                iterate.
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Calibration */}
      <Card className="mt-4 p-4">
        <h2 className="type-title">Calibration by Team Maturity</h2>
        <p className="mt-1 type-body-sm text-text-secondary">
          The ratio is a dial, not a law &mdash; reviewed monthly and quarterly.
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="border border-border-default px-3 py-2 text-left type-meta text-text-muted">
                  Team Stage
                </th>
                <th className="border border-border-default px-3 py-2 text-left type-meta text-text-muted">
                  Ratio
                </th>
                <th className="border border-border-default px-3 py-2 text-left type-meta text-text-muted">
                  When to Use
                </th>
              </tr>
            </thead>
            <tbody>
              {teamStages.map((row) => (
                <tr key={row.stage}>
                  <td className="border border-border-default px-3 py-2 type-label">
                    {row.stage}
                  </td>
                  <td className="border border-border-default px-3 py-2 type-meta text-text-primary font-mono">
                    {row.ratio}{" "}
                    <span className="text-text-muted">({row.parts})</span>
                  </td>
                  <td className="border border-border-default px-3 py-2 type-meta text-text-secondary">
                    {row.when}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Diagnostic questions */}
      <Card className="mt-4 p-4">
        <h2 className="type-title">Diagnostic Questions</h2>
        <p className="mt-1 type-body-sm text-text-secondary">
          Use these to determine the right ratio for your team:
        </p>
        <ol className="mt-3 list-decimal pl-5 space-y-2 type-body-sm text-text-secondary">
          {diagnosticQuestions.map((q) => (
            <li key={q}>{q}</li>
          ))}
        </ol>
      </Card>

      {/* Apprentice progression */}
      <Card className="mt-4 p-4">
        <h2 className="type-title">Apprentice Progression</h2>
        <p className="mt-1 type-body-sm text-text-secondary">
          As skill and judgment grow, the ratio shifts toward more AI-directed work:
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-4">
          {apprenticeProgression.map((p) => (
            <div
              key={p.level}
              className="rounded-lg border border-border-default p-3 text-center"
            >
              <p className="type-meta text-text-muted">{p.level}</p>
              <p className="mt-1 text-xl font-bold type-label">{p.ratio}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* CTA */}
      <Card className="mt-4 p-4 text-center">
        <p className="type-body-sm text-text-secondary">
          Want to calibrate the right ratio for your team?
        </p>
        <Link
          href="/services/request?offer=advisory-engagement"
          className="mt-2 inline-block rounded-md bg-action-primary px-4 py-2 type-label text-text-inverse"
        >
          Book an Advisory engagement &rarr;
        </Link>
      </Card>
    </PageShell>
  );
}
