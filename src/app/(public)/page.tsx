import type { Metadata } from "next";
import Link from "next/link";
import { HomeHero } from "@/components/experiments/home-hero";

export const metadata: Metadata = {
  title: "Studio Ordo — We train what AI can't automate",
  description:
    "Eight capabilities. Spec-driven method. Artifacts that prove how you work. 23 years, 10,000+ engineers.",
  openGraph: {
    title: "Studio Ordo — We train what AI can't automate",
    description:
      "Eight capabilities. Spec-driven method. Artifacts that prove how you work. 23 years, 10,000+ engineers.",
  },
  alternates: {
    canonical: "/",
  },
};

const capabilities = [
  { name: "Disciplined Inquiry", line: "Ask the question that changes the project." },
  { name: "Professional Judgment", line: "Override the confident machine when you should." },
  { name: "Resilience Thinking", line: "Design for what breaks at 2 AM." },
  { name: "Problem Finding", line: "Find the real problem, not the stated one." },
  { name: "Epistemic Humility", line: "Know what your data cannot represent." },
  { name: "Systems Thinking", line: "See how the parts interact where complexity hides." },
  { name: "Accountable Leadership", line: "Ship, present, defend — put your name on it." },
  { name: "Translation", line: "Make the complex accessible to anyone." },
] as const;

const methodSteps = [
  { label: "Spec", detail: "Write a Context Pack: project brief, domain context, evaluation criteria, prior context." },
  { label: "Tests", detail: "Define acceptance criteria before building (TDD)." },
  { label: "Build", detail: "40% manual exploration, 60% AI-assisted implementation." },
  { label: "Evaluate", detail: 'Automated quality measurement (not just "does it work?").' },
  { label: "Audit", detail: "AI Audit Log documenting accept/reject/modify decisions with reasoning." },
] as const;

export default function Home() {
  return (
    <main id="main-content" className="container-grid py-6">
      <HomeHero />

      {/* Section 01 — The Human Edge */}
      <section className="mt-6 surface p-6">
        <p className="type-meta text-text-muted">01 — The Human Edge</p>
        <h2 className="mt-2 type-title text-text-primary">Eight capabilities AI cannot replicate.</h2>
        <p className="mt-2 type-body-sm text-text-secondary">
          AI automates everything procedural. What remains is judgment, inquiry, resilience, and the ability to take
          responsibility for outcomes. These are not soft skills. They are the hard skills of the AI era.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {capabilities.map((c) => (
            <div key={c.name} className="surface-elevated p-4">
              <p className="type-label text-text-primary">{c.name}</p>
              <p className="mt-1 type-meta text-text-secondary">{c.line}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <Link href="/insights" className="type-label underline">
            See the framework →
          </Link>
          <Link href="/resources/assessment" className="type-meta text-text-secondary hover:text-text-primary underline">
            Take the Human Edge Scorecard assessment
          </Link>
        </div>
      </section>

      {/* Section 02 — Method */}
      <section className="mt-6 surface p-6">
        <p className="type-meta text-text-muted">02 — Method</p>
        <h2 className="mt-2 type-title text-text-primary">Spec → Tests → Build → Evaluate → Audit</h2>
        <p className="mt-2 type-body-sm text-text-secondary">
          The Ordo method uses the same workflow AI-capable teams use in production. 40% builds judgment — manual work
          that teaches you what the machine is doing. 60% builds velocity — directing AI agents with structured context.
          100% produces artifacts that prove how you work.
        </p>
        <ol className="mt-4 space-y-3">
          {methodSteps.map((step, i) => (
            <li key={step.label} className="flex gap-3 type-body-sm text-text-secondary">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-muted type-meta text-text-primary">
                {i + 1}
              </span>
              <span>
                <span className="type-label text-text-primary">{step.label}</span> — {step.detail}
                {step.label === "Spec" && (
                  <span className="block mt-1">
                    <Link href="/resources/context-pack" className="type-meta text-text-secondary hover:text-text-primary underline">
                      Get the Context Pack Starter Kit
                    </Link>
                  </span>
                )}
              </span>
            </li>
          ))}
        </ol>
        <p className="mt-4 type-meta text-text-muted">
          MIT randomized controlled trial: +40% faster task completion, +18% higher quality. Biggest gains for
          least-experienced workers.
        </p>
        <div className="mt-4">
          <Link href="/services/request" className="type-label underline">
            Book a technical consult →
          </Link>
        </div>
      </section>

      {/* Section 03 — Outcomes */}
      <section className="mt-6 grid gap-3 lg:grid-cols-3">
        <div className="surface p-6">
          <p className="type-meta text-text-muted">For Teams</p>
          <h3 className="mt-2 type-title text-text-primary">Delivery + accountability</h3>
          <p className="mt-2 type-body-sm text-text-secondary">
            Delivery throughput with AI accountability. Your team produces more — and can prove every decision to
            compliance, legal, or a board.
          </p>
          <p className="mt-3 type-meta text-text-muted">MIT RCT: +40% faster, +18% higher quality.</p>
        </div>
        <div className="surface p-6">
          <p className="type-meta text-text-muted">For Individuals</p>
          <h3 className="mt-2 type-title text-text-primary">AI-premium careers</h3>
          <p className="mt-2 type-body-sm text-text-secondary">
            Career acceleration at AI-premium rates. Engineers with these skills earn $110K–$350K+ depending on
            experience and capability depth.
          </p>
          <p className="mt-3 type-meta text-text-muted">
            Entry: $110K–$150K · Senior: $180K–$350K+ · Staff: $300K–$500K+
          </p>
        </div>
        <div className="surface p-6">
          <p className="type-meta text-text-muted">For Leaders</p>
          <h3 className="mt-2 type-title text-text-primary">Close the production gap</h3>
          <p className="mt-2 type-body-sm text-text-secondary">
            Only 48% of AI projects reach production. The bottleneck is not capability — it&apos;s people who can ship,
            evaluate, and take responsibility. Our graduates close that gap.
          </p>
        </div>
      </section>

      {/* Section 04 — Offers */}
      <section className="mt-6 surface p-6">
        <p className="type-meta text-text-muted">04 — Offers</p>
        <h2 className="mt-2 type-title text-text-primary">Training for every stage.</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="surface-elevated p-4">
            <p className="type-label text-text-primary">Workshop</p>
            <p className="mt-2 type-body-sm text-text-secondary">
              Hands-on training on one Human Edge capability. Real exercises, real artifacts, real evaluation.
            </p>
            <p className="mt-2 type-meta text-text-muted">
              Leave with: a Context Pack, an AI Audit Log entry, and 8 Spell Book terms.
            </p>
            <div className="mt-1">
              <Link href="/resources/spell-book" className="type-meta text-text-secondary hover:text-text-primary underline">
                Get the Spell Book PDF
              </Link>
            </div>
            <p className="mt-2 type-label text-text-primary">From $2,500 per session</p>
            <div className="mt-3">
              <Link href="/services/workshop" className="type-label underline">
                Learn more →
              </Link>
            </div>
          </div>
          <div className="surface-elevated p-4">
            <p className="type-label text-text-primary">Team Program</p>
            <p className="mt-2 type-body-sm text-text-secondary">
              6 weeks. 6 capabilities. 6 shipped artifacts. Pre/post Team Readiness Assessment proves measurable growth.
            </p>
            <p className="mt-2 type-meta text-text-muted">
              Leave with: complete artifact portfolio, team readiness scores, and a path forward.
            </p>
            <p className="mt-2 type-label text-text-primary">From $18,000 per team</p>
            <div className="mt-3">
              <Link href="/services/team-program" className="type-label underline">
                Learn more →
              </Link>
            </div>
          </div>
          <div className="surface-elevated p-4">
            <p className="type-label text-text-primary">Advisory</p>
            <p className="mt-2 type-body-sm text-text-secondary">
              We build your AI operating system — workflow mapping, guardrails, playbooks, and training. Embedded with
              your team for 1–3 months.
            </p>
            <p className="mt-2 type-meta text-text-muted">
              Leave with: operational playbook, trained team, measurable capability improvement.
            </p>
            <p className="mt-2 type-label text-text-primary">Custom engagement</p>
            <div className="mt-3">
              <Link href="/services/advisory" className="type-label underline">
                Learn more →
              </Link>
            </div>
          </div>
        </div>
        <div className="mt-4">
          <Link href="/services" data-measure-key="CTA_CLICK_VIEW_TRAINING_TRACKS" className="type-label underline">
            Explore all training tracks →
          </Link>
        </div>
      </section>

      {/* Section 05 — Studio */}
      <section className="mt-6 surface p-6">
        <p className="type-meta text-text-muted">05 — Studio</p>
        <h2 className="mt-2 type-title text-text-primary">Not a certificate. A portfolio of shipped work.</h2>
        <p className="mt-2 type-body-sm text-text-secondary">
          The Studio Ordo apprenticeship is a 12–18 month guided progression from working developer to AI-capable
          engineer. Four levels, eight gate projects, and a growing portfolio of artifacts that demonstrate capability to
          any employer or client.
        </p>
        <p className="mt-3 type-body-sm text-text-secondary">
          Alex joined the studio as a junior developer with 2 years of experience and a CS degree. Eighteen months
          later: 8 shipped projects, a Demo Day recording where they defended technical decisions under questioning, and
          a community AI training event with 22 participants and an NPS of 64.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {(
            [
              { level: "1", title: "Apprentice", months: "1–3", ships: "Portfolio + Production Calculator" },
              { level: "2", title: "Journeyman", months: "4–8", ships: "Curator Cards + Feature Build" },
              { level: "3", title: "Senior Journeyman", months: "9–14", ships: "Agentic Toolkit + Production Deploy" },
              { level: "4", title: "Maestro Candidate", months: "15–18+", ships: "Client Project + Community Training" },
            ] as const
          ).map((l) => (
            <div key={l.level} className="surface-elevated p-4">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-surface-muted type-meta text-text-primary">
                {l.level}
              </span>
              <p className="mt-2 type-label text-text-primary">{l.title}</p>
              <p className="mt-1 type-meta text-text-muted">Months {l.months}</p>
              <p className="mt-1 type-meta text-text-secondary">{l.ships}</p>
            </div>
          ))}
        </div>
        <div className="mt-4">
          <Link href="/studio" className="type-label underline">
            Join the studio →
          </Link>
        </div>
      </section>

      {/* Section 06 — Proof */}
      <section className="mt-6 grid gap-3 lg:grid-cols-2">
        <div className="surface p-6">
          <p className="type-meta text-text-muted">The Founder</p>
          <h3 className="mt-2 type-title text-text-primary">Keith Williams</h3>
          <p className="mt-2 type-body-sm text-text-secondary">
            23 years at NJIT. 10,000+ students taught. Built the Web Systems program, the MS Data Science program
            (200+ graduates), and the BS in Enterprise AI (300+ students enrolled). CTO at a startup acquired by Anthem
            Ventures. International consulting in Zambia. Programming since 1983.
          </p>
          <p className="mt-3 type-body-sm italic text-text-secondary">
            &quot;I&apos;ve watched 10,000 students graduate. I know what separates the ones who thrive from the ones
            who stall. It&apos;s not talent. It&apos;s method.&quot;
          </p>
          <div className="mt-3">
            <Link href="/about" className="type-label underline">
              Full bio →
            </Link>
          </div>
        </div>
        <div className="surface p-6">
          <p className="type-meta text-text-muted">The Acceleration</p>
          <h3 className="mt-2 type-title text-text-primary">The data is clear.</h3>
          <ul className="mt-3 space-y-2 type-body-sm text-text-secondary">
            <li>AI capability doubles every 3–4 months (METR, Feb 2026).</li>
            <li>Traditional developer job postings: down 51% (Indeed, 2023–2024).</li>
            <li>AI-skill postings: up 68% (UMD Smith School, Q4 2022–Q4 2024).</li>
            <li>$600B+ in hyperscaler AI investment in 2026 alone.</li>
          </ul>
          <p className="mt-3 type-meta italic text-text-muted">
            The infrastructure is being built. The question is whether your team is ready.
          </p>
          <div className="mt-3">
            <Link href="/services/request" className="type-label underline">
              Book a technical consult →
            </Link>
          </div>
        </div>
      </section>

      {/* Footer CTA — Newsletter */}
      <section className="mt-6 surface-elevated p-6 text-center">
        <h2 className="type-title text-text-primary">Get the Ordo Brief</h2>
        <p className="mt-2 type-body-sm text-text-secondary">
          Weekly AI capability data, salary insights, and practical frameworks. No hype.
        </p>
        <div className="mt-4">
          <Link href="/newsletter" className="type-label underline">
            Subscribe →
          </Link>
        </div>
      </section>
    </main>
  );
}
