import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { Card } from "@/components/primitives";
import { Badge } from "@/components/ui/badge";
import { listLevels, type ApprenticeLevelRecord } from "@/lib/api/apprentice-progress";
import { RecommendedEvents } from "./recommended-events";

export const metadata: Metadata = {
  title: "Studio \u2022 Studio Ordo",
  description:
    "Not a certificate. A portfolio of shipped work. 12\u201318 months, four levels, eight gate projects.",
  openGraph: {
    title: "Studio \u2022 Studio Ordo",
    description:
      "Not a certificate. A portfolio of shipped work. 12\u201318 months, four levels, eight gate projects.",
  },
  alternates: {
    canonical: "/studio",
  },
};

const getLevels = (): ApprenticeLevelRecord[] => {
  try {
    return listLevels();
  } catch {
    return [];
  }
};

const gateProjects = [
  { gate: 1, level: "Apprentice", title: "Professional Portfolio Site", description: "Hand-crafted HTML, CSS, vanilla JavaScript. No frameworks. Build every element from scratch to prove you understand what the framework abstracts away.", proves: "Disciplined Inquiry" },
  { gate: 2, level: "Apprentice", title: "Production Calculator with CI/CD", description: "A deliberately boring domain. The point is 100% test coverage, a CI/CD pipeline, and an AI Audit Log with 10+ documented decisions.", proves: "Professional Judgment" },
  { gate: 3, level: "Journeyman", title: "Design Curator Cards", description: "Choose an unfamiliar topic. Research it using the autodidactic loop. Produce 30 evidence-backed cards. Have a Named Expert critique your synthesis.", proves: "Problem Finding" },
  { gate: 4, level: "Journeyman", title: "Feature Build on Existing System", description: "Merge a non-trivial feature into an existing production codebase. Write a Failure Mode Analysis. Survive a 30-minute unannounced incident drill.", proves: "Resilience Thinking" },
  { gate: 5, level: "Senior Journeyman", title: "Agentic Orchestration Toolkit", description: "Build from scratch using SOLID principles, Command pattern, and dependency injection. Implement the 10 Core Orchestration Principles.", proves: "Systems Thinking" },
  { gate: 6, level: "Senior Journeyman", title: "Production Deployment Platform", description: "Terraform + Ansible + Docker Compose + Traefik. Defense-in-depth (6 layers). STRIDE threat model.", proves: "Epistemic Humility" },
  { gate: 7, level: "Maestro Candidate", title: "Client Project Delivery", description: "A real client. A real problem. Build a solution with knowledge graph + human-in-the-loop evaluation. Present at Demo Day \u2014 20-minute defense.", proves: "Accountable Leadership" },
  { gate: 8, level: "Maestro Candidate", title: "Community AI Training Event", description: "Design a curriculum using the Feynman technique. Run a live event \u2014 15+ participants, real NPS collection, post-event survey.", proves: "Translation" },
] as const;

const roleReadiness = [
  { level: "Level 2 (Journeyman)", role: "Entry AI-capable role", salary: "$80K\u2013$110K", signal: "Spec-driven workflow, AI Audit Log, can learn new domains independently" },
  { level: "Level 3 (Senior Journeyman)", role: "Mid-level AI engineer", salary: "$110K\u2013$160K", signal: "Production infrastructure, agentic systems, STRIDE modeling, incident response" },
  { level: "Level 4 (Maestro Candidate)", role: "Senior AI engineer / Tech Lead", salary: "$140K\u2013$260K+", signal: "Client delivery, team leadership, community teaching, full artifact portfolio" },
] as const;

export default function StudioPage() {
  const levels = getLevels();

  return (
    <PageShell
      title="Studio"
      subtitle="Not a certificate. A portfolio of shipped work."
    >
      <section className="surface overflow-hidden rounded-sm border border-border-default relative">
        <Image
          src="/studio/studio-banner.png"
          alt="Studio Ordo workshop desk — calm, disciplined craft"
          width={1536}
          height={1024}
          priority
          className="h-auto w-full"
        />
      </section>

      {/* Executive Summary & CTA */}
      <section className="mt-6 surface-elevated p-6 rounded-lg border border-border-subtle">
        <div className="grid gap-6 md:grid-cols-2 items-center">
          <div>
            <h2 className="type-title text-text-primary mb-2">The Studio Apprenticeship</h2>
            <p className="type-body-sm text-text-secondary mb-4">
              A 12–18 month guided progression from working developer to AI-capable engineer. 
              For developers who want to direct AI agents, not just prompt them.
            </p>
            <ul className="space-y-2 type-body-sm text-text-secondary mb-6 list-disc list-inside">
              <li><strong>What you'll do:</strong> Ship 8 production-grade projects under maestro supervision.</li>
              <li><strong>What you'll have:</strong> A portfolio of evaluable artifacts, not a multiple-choice certificate.</li>
            </ul>
            <div className="flex flex-wrap items-center gap-4">
              <a
                href="https://cal.com/alex-macaw/30min"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-md bg-text-primary px-6 py-3 text-sm font-medium text-bg-primary hover:bg-text-secondary transition-colors"
              >
                Book a Technical Consult
              </a>
              <Link href="/resources/context-pack" className="type-label text-text-secondary hover:text-text-primary underline underline-offset-4">
                Get the Context Pack Starter Kit &rarr;
              </Link>
            </div>
          </div>
          <div className="hidden md:block">
            <div className="overflow-hidden rounded-sm border border-border-default bg-surface">
              <Image
                src="/studio/studio-artifact.png"
                alt="Studio Ordo artifacts — specs, checklists, and disciplined notes"
                width={1024}
                height={1024}
                className="h-auto w-full"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Main Content with Sticky Sidebar */}
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_300px] items-start">
        <div className="space-y-6">
          {/* Section 01 \u2014 The Model */}
          <section className="surface p-6">
            <p className="type-meta text-text-muted">The Model</p>
            <div className="mt-4">
              <h2 className="type-title text-text-primary">The bottega model. Updated for the AI era.</h2>
              <div className="mt-4 space-y-3 type-body-sm text-text-secondary">
                <p>
                  A bottega was a Renaissance workshop &mdash; the place where apprentices learned by producing real work under
                  the guidance of a master craftsman. Leonardo da Vinci trained in Verrocchio&apos;s bottega not by attending
                  lectures but by grinding pigments, preparing canvases, and eventually painting the angel that surpassed the
                  master.
                </p>
                <p>
                  Studio Ordo works the same way. You learn by shipping. Every level produces artifacts &mdash; real,
                  evaluable, portfolio-ready work that demonstrates capability. There are no multiple-choice exams.
                  There&apos;s no seat time requirement. Progress is measured by what you produce, judged against professional
                  standards.
                </p>
                <p>
                  The maestro (Keith Williams, 23 years, 10,000+ students) provides structured guidance, code review, project
                  feedback, and the &ldquo;invisible curriculum&rdquo; &mdash; the professional vocabulary, judgment patterns,
                  and failure modes that only come from experience.
                </p>
              </div>
            </div>
          </section>

          {/* Section 02 \u2014 Alex\u2019s Journey */}
          <section className="surface p-6">
            <p className="type-meta text-text-muted">The Journey</p>
            <h2 className="mt-2 type-title text-text-primary">Alex&apos;s story.</h2>
            <div className="mt-4 space-y-4">
              <div>
                <p className="type-label text-text-primary">Month 1</p>
                <p className="mt-1 type-body-sm text-text-secondary">
                  Alex joined the studio as a junior developer with 2 years of experience and a CS degree. They could write
                  React components and follow tutorials. They had never written a spec, never run a CI pipeline from scratch,
                  and their idea of testing was &ldquo;it works when I click it.&rdquo;
                </p>
              </div>
              <div>
                <p className="type-label text-text-primary">Month 3</p>
                <p className="mt-1 type-body-sm text-text-secondary">
                  Alex shipped their first two gate projects &mdash; a professional portfolio site built without frameworks
                  and a production calculator with 100% test coverage and a CI/CD pipeline. They started keeping an AI Audit
                  Log. Their Context Pack was rough but real. They had 15 Spell Book terms they could actually define.
                </p>
              </div>
              <div>
                <p className="type-label text-text-primary">Month 6</p>
                <p className="mt-1 type-body-sm text-text-secondary">
                  Journeyman level. Alex shipped a Design Curator Cards project using the autodidactic loop. They chose a
                  topic they knew nothing about, produced 30 evidence-backed cards, and had a Named Expert review their
                  synthesis. They were learning how to learn, not just how to code.
                </p>
              </div>
              <div>
                <p className="type-label text-text-primary">Month 10</p>
                <p className="mt-1 type-body-sm text-text-secondary">
                  Alex merged a feature into an existing production codebase, wrote a Failure Mode Analysis, and survived an
                  unannounced 30-minute incident drill. They handled a P2 gracefully. Their Context Pack was on version 3.
                  They had 35 Spell Book terms.
                </p>
              </div>
              <div>
                <p className="type-label text-text-primary">Month 14</p>
                <p className="mt-1 type-body-sm text-text-secondary">
                  Senior Journeyman. Alex built an agentic orchestration toolkit from scratch &mdash; SOLID architecture,
                  Command pattern, dependency injection. Then deployed a production platform with Terraform, Ansible, Docker
                  Compose, and Traefik. They wrote a STRIDE threat model. They could design for failure, not just respond to
                  it.
                </p>
              </div>
              <div>
                <p className="type-label text-text-primary">Month 18</p>
                <p className="mt-1 type-body-sm text-text-secondary">
                  Maestro Candidate. Alex delivered a real client project &mdash; a knowledge graph with human-in-the-loop
                  evaluation. They presented at Demo Day, defending technical decisions under questioning for 20 minutes.
                  Then they ran a community AI training event &mdash; 22 participants, NPS of 64, curriculum they designed
                  using the Feynman technique.
                </p>
              </div>
              <div>
                <p className="type-label text-text-primary">Today</p>
                <p className="mt-1 type-body-sm text-text-secondary">
                  Alex&apos;s portfolio: 8 shipped projects, 60+ Spell Book terms, a Context Pack that reads like a senior
                  engineer&apos;s operating manual, and an AI Audit Log with hundreds of documented decisions. Not a
                  certificate. Evidence.
                </p>
              </div>
            </div>
          </section>

          {/* Section 03 \u2014 The Levels (dynamic from DB) */}
          {levels.length > 0 ? (
            <section>
              <h2 className="type-title text-text-primary">Four levels. Clear progression.</h2>
              <p className="mt-1 type-body-sm text-text-secondary">
                Each level requires passing gate projects and demonstrating Spell Book vocabulary.
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {levels.map((level, index) => (
                  <Card key={level.slug} className="relative p-5">
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-muted type-label text-text-primary">
                        {index + 1}
                      </span>
                      <Badge variant={index === 0 ? "default" : "outline"}>{level.name}</Badge>
                    </div>
                    {level.description ? (
                      <p className="mt-3 type-body-sm text-text-secondary">{level.description}</p>
                    ) : null}
                    <dl className="mt-3 space-y-1">
                      <div>
                        <dt className="type-meta text-text-muted">Gate projects</dt>
                        <dd className="type-label text-text-primary">{level.min_gate_projects}</dd>
                      </div>
                      <div>
                        <dt className="type-meta text-text-muted">Spell Book terms</dt>
                        <dd className="type-label text-text-primary">{level.min_vocabulary}+</dd>
                      </div>
                      {level.human_edge_focus ? (
                        <div>
                          <dt className="type-meta text-text-muted">Human Edge focus</dt>
                          <dd className="type-label text-text-primary">{level.human_edge_focus}</dd>
                        </div>
                      ) : null}
                      {level.salary_range ? (
                        <div>
                          <dt className="type-meta text-text-muted">Salary range</dt>
                          <dd className="type-label text-text-primary">{level.salary_range}</dd>
                        </div>
                      ) : null}
                    </dl>
                  </Card>
                ))}
              </div>
            </section>
          ) : null}

          {/* Section 04 \u2014 Gate Projects */}
          <section>
            <details className="group surface p-6 rounded-lg border border-border-subtle [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer items-center justify-between">
                <div>
                  <h2 className="type-title text-text-primary">Eight projects. Each one proves a capability.</h2>
                  <p className="mt-1 type-body-sm text-text-secondary">View the full gate project progression.</p>
                </div>
                <span className="ml-4 flex h-8 w-8 items-center justify-center rounded-full bg-surface-muted text-text-secondary group-open:rotate-180 transition-transform">
                  ↓
                </span>
              </summary>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {gateProjects.map((gp) => (
                  <Card key={gp.gate} className="p-4">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-muted type-meta text-text-primary">
                        {gp.gate}
                      </span>
                      <Badge variant="outline">{gp.level}</Badge>
                    </div>
                    <h3 className="mt-3 type-label text-text-primary">{gp.title}</h3>
                    <p className="mt-1 type-body-sm text-text-secondary">{gp.description}</p>
                    <p className="mt-2 type-meta text-text-muted">Proves: {gp.proves}</p>
                  </Card>
                ))}
              </div>
            </details>
          </section>

          {/* Section 05 \u2014 Role Readiness */}
          <section>
            <details className="group surface p-6 rounded-lg border border-border-subtle [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer items-center justify-between">
                <div>
                  <h2 className="type-title text-text-primary">Where the levels map to in the market.</h2>
                  <p className="mt-1 type-body-sm text-text-secondary">View role readiness and salary expectations.</p>
                </div>
                <span className="ml-4 flex h-8 w-8 items-center justify-center rounded-full bg-surface-muted text-text-secondary group-open:rotate-180 transition-transform">
                  ↓
                </span>
              </summary>
              <div className="mt-6 overflow-x-auto">
                <table className="w-full type-body-sm">
                  <thead>
                    <tr className="border-b border-border-default">
                      <th className="pb-2 text-left type-label text-text-primary">Studio Level</th>
                      <th className="pb-2 text-left type-label text-text-primary">Market Role</th>
                      <th className="pb-2 text-left type-label text-text-primary">Salary Range</th>
                      <th className="pb-2 text-left type-label text-text-primary">What Employers See</th>
                    </tr>
                  </thead>
                  <tbody className="text-text-secondary">
                    {roleReadiness.map((rr) => (
                      <tr key={rr.level} className="border-b border-border-default">
                        <td className="py-2">{rr.level}</td>
                        <td className="py-2">{rr.role}</td>
                        <td className="py-2">{rr.salary}</td>
                        <td className="py-2">{rr.signal}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 type-meta text-text-muted">
                BLS projects 26% growth for software developers 2022\u20132032. AI-skill job postings up 68% (UMD Smith School).
                NYC/NJ AI engineer median: $184K\u2013$213K+ (Glassdoor, 2025).
              </p>
            </details>
          </section>

          {/* Section 06 \u2014 CEO of Agents */}
          <section className="surface p-6">
            <p className="type-meta text-text-muted">The Destination</p>
            <h2 className="mt-2 type-title text-text-primary">You&apos;re not learning to code. You&apos;re learning to direct.</h2>
            <div className="mt-4 space-y-3 type-body-sm text-text-secondary">
              <p>
                By Level 3, you spend 65% of your time directing AI agents and 35% doing manual exploration. By Level 4,
                it&apos;s 80/20. You&apos;re not a coder who uses AI. You&apos;re an engineer who orchestrates AI &mdash;
                evaluating output, managing context, making judgment calls, and taking responsibility for outcomes.
              </p>
              <p>
                This is what the market pays a premium for. Not the ability to prompt. The ability to direct, evaluate, and
                ship.
              </p>
              <p>
                The <Link href="/resources/context-pack" className="underline hover:text-text-primary">Context Pack</Link> (your structured project brief) is your operating document. The AI Audit Log is your decision trail. The <Link href="/resources/spell-book" className="underline hover:text-text-primary">Spell Book</Link> is your
                shared professional vocabulary. Together, they make you the CEO of your AI agents &mdash; accountable, structured,
                and effective.
              </p>
            </div>
          </section>
        </div>

        {/* Sticky Sidebar */}
        <aside className="sticky top-6 space-y-6">
          {/* Recommended Events */}
          <section className="surface p-6 rounded-lg border border-border-subtle">
            <h2 className="type-title text-text-primary">Recommended events</h2>
            <p className="mt-1 type-body-sm text-text-secondary">
              Field work is part of the apprenticeship: attend, then write a structured report.
            </p>
            <div className="mt-4">
              <RecommendedEvents />
            </div>
          </section>
        </aside>
      </div>

      {/* Page CTA */}
      <section className="mt-6 surface-elevated p-6 text-center rounded-lg border border-border-subtle">
        <h2 className="type-title text-text-primary">Ready to see if the studio is right for you?</h2>
        <p className="mt-2 type-body-sm text-text-secondary mb-6">
          Book a 30-minute technical consult. We&apos;ll review your current skills, discuss your goals, and determine
          which level you&apos;d start at.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href="https://cal.com/alex-macaw/30min"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-md bg-text-primary px-6 py-3 text-sm font-medium text-bg-primary hover:bg-text-secondary transition-colors"
          >
            Book a Technical Consult
          </a>
          <Link href="/resources/context-pack" className="type-label text-text-secondary hover:text-text-primary underline underline-offset-4">
            Get the Context Pack Starter Kit &rarr;
          </Link>
        </div>
      </section>
    </PageShell>
  );
}
