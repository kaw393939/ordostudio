import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { Card } from "@/components/primitives";

export const metadata: Metadata = {
  title: "The AI Audit Log — Studio Ordo",
  description:
    "A decision trail for every AI interaction. Accept, modify, or reject — and document why. Accountability, quality control, compliance, and institutional learning.",
  openGraph: {
    title: "The AI Audit Log — Studio Ordo",
    description:
      "Accept, modify, or reject every AI output — and document why.",
  },
};

const templateFields = [
  { field: "Date", description: "When the interaction occurred", example: "2026-02-22" },
  { field: "Task", description: "What you were trying to accomplish", example: "Implement rate-limiting middleware for API routes" },
  { field: "AI Tool", description: "Which tool/model was used", example: "Claude via Cursor" },
  { field: "Context Provided", description: "Summary of the Context Pack or prompt context", example: "Full Context Pack: project brief, architecture docs, existing test patterns, evaluation criteria" },
  { field: "Output Summary", description: "What the AI produced (brief)", example: "Token bucket implementation with per-route config, 3 test files, middleware registration" },
  { field: "Decision", description: "Accept / Modify / Reject", example: "Modify" },
  { field: "Rationale", description: "Why you made this decision", example: "Implementation correct but used hardcoded rate limits. Modified to read from config. Test coverage missed the bucket refill edge case \u2014 added manually." },
  { field: "Time Estimate", description: "How long it would have taken without AI", example: "~4 hours manual vs. ~1.5 hours with AI (including review and modification)" },
];

const whyItMatters = [
  { title: "Accountability", description: "Creates a decision trail \u2014 who shipped what and why. When something breaks, you can trace the decision chain." },
  { title: "Quality Control", description: "Reveals patterns. Frequent rejections = bad Context Pack. Increasing acceptance = improving Context Packs." },
  { title: "Compliance", description: "Satisfies regulated industry requirements for AI documentation. Audit-ready from day one." },
  { title: "Institutional Learning", description: "Which tools work best for which tasks? Where does AI consistently fail? The log teaches the team." },
];

const adoptionPhases = [
  { phase: "Phase 1 (Weeks 1\u20132)", title: "Individual, voluntary", description: "Production-bound interactions only. Low friction, high signal." },
  { phase: "Phase 2 (Weeks 3\u20134)", title: "All team members", description: "Weekly 15-minute review sharing interesting entries. Build the habit." },
  { phase: "Phase 3 (Month 2+)", title: "Part of Definition of Done", description: "Sprint retro includes Audit Log review. Monthly quality analysis. Continuous improvement." },
];

export default function AIAuditLogPage() {
  return (
    <PageShell
      title="The AI Audit Log"
      subtitle="A decision trail for every AI interaction. Accept, modify, or reject \u2014 and document why."
      breadcrumbs={[
        { label: "Frameworks", href: "/frameworks" },
        { label: "AI Audit Log" },
      ]}
    >
      {/* Why it matters */}
      <Card className="p-4">
        <h2 className="type-title">Why it matters</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {whyItMatters.map((item) => (
            <div
              key={item.title}
              className="rounded-lg border border-border-default p-3"
            >
              <h3 className="type-label">{item.title}</h3>
              <p className="mt-1 type-body-sm text-text-secondary">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </Card>

      {/* Template preview */}
      <Card className="mt-4 p-4">
        <h2 className="type-title">Template</h2>
        <p className="mt-1 type-body-sm text-text-secondary">
          Each entry captures one AI interaction with enough detail to learn from it.
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="border border-border-default px-3 py-2 text-left type-meta text-text-muted">Field</th>
                <th className="border border-border-default px-3 py-2 text-left type-meta text-text-muted">Description</th>
                <th className="border border-border-default px-3 py-2 text-left type-meta text-text-muted">Example</th>
              </tr>
            </thead>
            <tbody>
              {templateFields.map((row) => (
                <tr key={row.field}>
                  <td className="border border-border-default px-3 py-2 type-label">{row.field}</td>
                  <td className="border border-border-default px-3 py-2 type-meta text-text-secondary">{row.description}</td>
                  <td className="border border-border-default px-3 py-2 type-meta text-text-muted italic">{row.example}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Team adoption */}
      <Card className="mt-4 p-4">
        <h2 className="type-title">Team Adoption Guide</h2>
        <p className="mt-1 type-body-sm text-text-secondary">
          Start small, build the habit, then make it part of the process.
        </p>
        <div className="mt-3 space-y-3">
          {adoptionPhases.map((phase, i) => (
            <div
              key={phase.phase}
              className="flex gap-3 rounded-lg border border-border-default p-3"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-action-primary/10 type-label text-action-primary">
                {i + 1}
              </div>
              <div>
                <p className="type-label">
                  {phase.phase}{" "}
                  <span className="font-normal text-text-muted">
                    \u2014 {phase.title}
                  </span>
                </p>
                <p className="mt-0.5 type-body-sm text-text-secondary">
                  {phase.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* CTA */}
      <Card className="mt-4 p-4 text-center">
        <p className="type-body-sm text-text-secondary">
          Ready to bring accountability to your AI workflow?
        </p>
        <Link
          href="/services/request?offer=workshop-ai-accountability"
          className="mt-2 inline-block rounded-md bg-action-primary px-4 py-2 type-label text-text-inverse"
        >
          Book an AI Accountability workshop \u2192
        </Link>
      </Card>
    </PageShell>
  );
}
