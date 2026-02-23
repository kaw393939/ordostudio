"use client";

import { useState } from "react";
import { PageShell } from "@/components/layout/page-shell";
import { Card } from "@/components/primitives";
import { Badge } from "@/components/ui/badge";
import { EmailCapture } from "@/components/lead-magnets/email-capture";

const categories = [
  {
    name: "Foundations",
    terms: ["Context Pack", "AI Audit Log", "Human Edge", "40/60 Ratio", "Spell Book", "Spec-Driven Development", "Acceptance Criteria", "Gate Project"],
  },
  {
    name: "Inquiry & Judgment",
    terms: ["Disciplined Inquiry", "Professional Judgment", "Autodidactic Loop", "Named Expert Critique", "Problem Decomposition", "Prompt Engineering", "Evidence-Backed Claim", "CLAIMS.md"],
  },
  {
    name: "Resilience & Systems",
    terms: ["Failure Mode Analysis", "Incident Drill", "Defense-in-Depth", "Error Budget", "Orchestration", "Command Pattern", "Dependency Injection", "STRIDE Model"],
  },
  {
    name: "Data & Evaluation",
    terms: ["Epistemic Humility", "Data Assumptions Document", "Evaluation Criteria", "Deployment Gap", "Hybrid Data Stack", "RAG", "Benchmark Saturation", "Human-in-the-Loop"],
  },
  {
    name: "Leadership & Translation",
    terms: ["Accountable Leadership", "Translation Brief", "Demo Day", "Feynman Technique", "Cognitive Load Theory", "Field Report", "Team Readiness Assessment", "Maestro"],
  },
] as const;

export default function SpellBookResourcePage() {
  const [unlocked, setUnlocked] = useState(false);

  return (
    <PageShell
      title="The Spell Book"
      subtitle="40 terms. Zero jargon. Start using them Monday."
      breadcrumbs={[{ label: "Resources", href: "/resources" }, { label: "Spell Book" }]}
    >
      {/* Intro */}
      <section className="mt-4">
        <Card className="p-5">
          <p className="type-body-sm text-text-secondary">
            Professional vocabulary creates precision. Precision creates communication.
            Communication creates teams that ship.
          </p>
          <p className="type-body-sm mt-3 text-text-secondary">
            This document contains 40 terms that define how AI-capable engineers think and work.
            They come from 23 years of teaching, 10,000 graduates, and the evidence-based frameworks
            behind Studio Ordo&apos;s training programs. Each term includes a working definition,
            why it matters, and an example of how it appears in practice.
          </p>
          <div className="mt-3 flex items-center gap-3">
            <Badge variant="secondary">PDF</Badge>
            <span className="type-meta text-text-muted">12–16 pages • Print-friendly</span>
          </div>
        </Card>
      </section>

      {/* Categories preview */}
      <section className="mt-8">
        <h2 className="type-title text-text-primary">What&apos;s inside</h2>
        <p className="mt-1 type-meta text-text-muted">5 categories × 8 terms = 40 professional vocabulary entries</p>
        <div className="mt-4 grid gap-4 md:grid-cols-5">
          {categories.map((cat) => (
            <Card key={cat.name} className="p-4">
              <h3 className="type-label text-text-primary">{cat.name}</h3>
              <ul className="mt-2 space-y-1">
                {cat.terms.map((term) => (
                  <li key={term} className="type-meta text-text-muted">
                    {term}
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      </section>

      {/* Per-term format teaser */}
      <section className="mt-8">
        <h2 className="type-title text-text-primary">Each term includes</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <Card className="p-4">
            <h3 className="type-label text-text-primary">Working definition</h3>
            <p className="mt-1 type-meta text-text-muted">1–2 sentences. Precise enough to use in a code review.</p>
          </Card>
          <Card className="p-4">
            <h3 className="type-label text-text-primary">Why it matters</h3>
            <p className="mt-1 type-meta text-text-muted">One sentence connecting the term to professional practice.</p>
          </Card>
          <Card className="p-4">
            <h3 className="type-label text-text-primary">In practice</h3>
            <p className="mt-1 type-meta text-text-muted">One concrete example of the term in real engineering work.</p>
          </Card>
        </div>
      </section>

      {/* Email gate */}
      <section className="mt-8" id="download">
        {unlocked ? (
          <Card className="p-5 text-center">
            <h3 className="type-title text-text-primary">Download ready</h3>
            <p className="mt-2 type-body-sm text-text-secondary">
              The Spell Book PDF is available for download. A copy has also been sent to your email.
            </p>
            <a
              href="/resources/spell-book.pdf"
              className="mt-4 inline-block rounded-sm border border-action-primary bg-action-primary px-4 py-2 type-label text-text-inverse hover:bg-action-primary-hover"
              download
            >
              Download PDF
            </a>
          </Card>
        ) : (
          <EmailCapture
            source="spell-book"
            headline="Get the Spell Book"
            description="Enter your email to download the PDF. You'll also receive the Ordo Brief — a short newsletter covering models, money, people, and what to do next."
            ctaLabel="Download PDF"
            pagePath="/resources/spell-book"
            onSuccess={() => setUnlocked(true)}
          />
        )}
      </section>

      {/* Who this is for */}
      <section className="mt-8 mb-4">
        <Card className="p-5">
          <h2 className="type-title text-text-primary">Who this is for</h2>
          <ul className="mt-3 space-y-2 type-body-sm text-text-secondary">
            <li>• <strong>Engineers</strong> who want precise AI vocabulary for prompts, code reviews, and architecture discussions</li>
            <li>• <strong>Managers</strong> who need a shared language for their team&apos;s AI capability development</li>
            <li>• <strong>Leaders</strong> who want to evaluate AI readiness using concrete, named concepts</li>
          </ul>
        </Card>
      </section>
    </PageShell>
  );
}
