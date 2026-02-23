import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { Card } from "@/components/primitives";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Workshops \u2022 Training \u2022 Studio Ordo",
  description:
    "Half-day and full-day workshops. One Human Edge capability. Real artifacts. Built on the Ordo method.",
  openGraph: {
    title: "Workshops \u2022 Training \u2022 Studio Ordo",
    description:
      "Half-day and full-day workshops. One Human Edge capability. Real artifacts. Built on the Ordo method.",
  },
  alternates: {
    canonical: "/services/workshop",
  },
};

const catalog = [
  { num: 1, title: "What Belongs to You", capability: "Disciplined Inquiry", duration: "Half-day", artifact: "First Context Pack" },
  { num: 2, title: "The Audit Trail", capability: "Professional Judgment", duration: "Half-day", artifact: "AI Audit Log" },
  { num: 3, title: "Build for the Break", capability: "Resilience Thinking", duration: "Full-day", artifact: "Failure Mode Analysis" },
  { num: 4, title: "Finding the Real Problem", capability: "Problem Finding", duration: "Half-day", artifact: "Problem Decomposition" },
  { num: 5, title: "What Your Data Cannot Say", capability: "Epistemic Humility", duration: "Half-day", artifact: "Data Assumptions Doc" },
  { num: 6, title: "The Orchestration Workshop", capability: "Systems Thinking", duration: "Full-day", artifact: "Agentic Workflow" },
  { num: 7, title: "Ship & Present", capability: "Accountable Leadership", duration: "Half-day", artifact: "Demo Day Recording" },
  { num: 8, title: "Making AI Accessible", capability: "Translation", duration: "Half-day", artifact: "Translation Brief" },
] as const;

export default function WorkshopTrainingPage() {
  return (
    <PageShell title="Workshops" subtitle="Half-day and full-day workshops. One capability. Real artifacts.">
      {/* Overview */}
      <section className="surface p-6">
        <p className="type-body-sm text-text-secondary">
          Each workshop focuses on one Human Edge capability. Participants work through real exercises using the Ordo
          method &mdash; spec-driven development with AI tools, structured around the 40/60 ratio. No slides-only sessions.
          No demo-watching. Every attendee leaves with artifacts they produced under professional conditions.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="surface-elevated p-3">
            <p className="type-label text-text-primary">Context Pack</p>
            <p className="type-meta text-text-secondary">For the domain explored</p>
          </div>
          <div className="surface-elevated p-3">
            <p className="type-label text-text-primary">AI Audit Log</p>
            <p className="type-meta text-text-secondary">Accept/reject/modify decisions</p>
          </div>
          <div className="surface-elevated p-3">
            <p className="type-label text-text-primary">8+ Spell Book terms</p>
            <p className="type-meta text-text-secondary">Working definitions</p>
          </div>
          <div className="surface-elevated p-3">
            <p className="type-label text-text-primary">Practical framework</p>
            <p className="type-meta text-text-secondary">Apply Monday morning</p>
          </div>
        </div>
      </section>

      {/* Workshop Catalog */}
      <section className="mt-6">
        <h2 className="type-title text-text-primary">Workshop Catalog</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {catalog.map((w) => (
            <Card key={w.num} className="p-4">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-muted type-meta text-text-primary">
                  {w.num}
                </span>
                <Badge variant={w.duration === "Full-day" ? "default" : "outline"}>{w.duration}</Badge>
              </div>
              <h3 className="mt-3 type-label text-text-primary">{w.title}</h3>
              <p className="mt-1 type-meta text-text-secondary">{w.capability}</p>
              <p className="mt-2 type-meta text-text-muted">Key artifact: {w.artifact}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Who This Is For */}
      <section className="mt-6 grid gap-3 lg:grid-cols-3">
        <div className="surface p-6">
          <p className="type-meta text-text-muted">Engineering Manager</p>
          <p className="mt-2 type-body-sm text-text-secondary">
            You have a team of 6&ndash;20 developers. AI tools are adopted unevenly. Some use Copilot constantly;
            others don&apos;t trust it. You need a shared vocabulary and a measurable baseline.
          </p>
          <p className="mt-3 type-meta text-text-muted">
            Start with: Workshop 1 (What Belongs to You) &rarr; Workshop 2 (The Audit Trail)
          </p>
        </div>
        <div className="surface p-6">
          <p className="type-meta text-text-muted">VP of Engineering</p>
          <p className="mt-2 type-body-sm text-text-secondary">
            You&apos;re responsible for AI adoption at scale. You need metrics, not vibes. You need to show the board
            that your investment in AI tooling is producing measurable improvements.
          </p>
          <p className="mt-3 type-meta text-text-muted">Start with: Team Program &rarr; Advisory</p>
        </div>
        <div className="surface p-6">
          <p className="type-meta text-text-muted">Individual Contributor</p>
          <p className="mt-2 type-body-sm text-text-secondary">
            You write code every day. AI tools are everywhere. You want to know when to trust the output and when to
            override it. You want to be the person your team sends to figure out new approaches.
          </p>
          <p className="mt-3 type-meta text-text-muted">
            Start with: Workshop 1 &rarr; Workshop 6 (The Orchestration Workshop)
          </p>
        </div>
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
                <th className="pb-2 text-left type-label text-text-primary">Includes</th>
              </tr>
            </thead>
            <tbody className="text-text-secondary">
              <tr className="border-b border-border-default">
                <td className="py-2">Half-day workshop (up to 20)</td>
                <td className="py-2">$2,500</td>
                <td className="py-2">Facilitator, materials, evaluation</td>
              </tr>
              <tr className="border-b border-border-default">
                <td className="py-2">Full-day workshop (up to 20)</td>
                <td className="py-2">$4,500</td>
                <td className="py-2">Above + advanced exercises, extended artifacts</td>
              </tr>
              <tr>
                <td className="py-2">Additional participants (per person)</td>
                <td className="py-2">$125 / $200</td>
                <td className="py-2">Half-day / Full-day</td>
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
            <p className="type-label text-text-primary">We already use AI tools. Why do we need training?</p>
            <p className="mt-1 type-body-sm text-text-secondary">
              Using AI tools and using them well are different things. 48% of AI projects fail to reach production. The
              gap is not tooling &mdash; it&apos;s judgment, evaluation, and accountability. That&apos;s what we train.
            </p>
          </div>
          <div>
            <p className="type-label text-text-primary">Can we customize the content for our domain?</p>
            <p className="mt-1 type-body-sm text-text-secondary">
              Yes. Every workshop includes a pre-engagement call where we adapt examples and exercises to your industry,
              tech stack, and team composition. The method stays the same. The domain changes.
            </p>
          </div>
          <div>
            <p className="type-label text-text-primary">What&apos;s the ROI?</p>
            <p className="mt-1 type-body-sm text-text-secondary">
              MIT&apos;s randomized controlled trial showed +40% faster task completion and +18% higher quality. Our
              workshops teach the same spec-driven, evaluation-focused methodology. We provide pre/post assessment data
              so you can measure your own results.
            </p>
          </div>
        </div>
      </section>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Link
          href="/services/request?offer=workshop"
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
