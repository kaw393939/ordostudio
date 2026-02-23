"use client";

import { useState } from "react";
import { PageShell } from "@/components/layout/page-shell";
import { Card } from "@/components/primitives";
import { Badge } from "@/components/ui/badge";
import { EmailCapture } from "@/components/lead-magnets/email-capture";

const templates = [
  {
    name: "v1 — Starter",
    scope: "Individual projects and small features",
    includes: ["Project brief (what, why, constraints)", "Domain context (key terms, business rules)", "Clearly labeled [FILL IN] markers"],
  },
  {
    name: "v2 — Structured",
    scope: "Team projects and features on existing systems",
    includes: [
      "Everything in v1",
      "Evaluation criteria (how do we know it\u2019s done?)",
      "Agent instructions (what should AI tools know?)",
      "Prior context (links to related Context Packs)",
    ],
  },
  {
    name: "v3 — Complete",
    scope: "Production systems and complex architectures",
    includes: [
      "Everything in v2",
      "Failure modes (what can go wrong?)",
      "Orchestration spec (how do agents coordinate?)",
      "Data assumptions (what are we assuming about our data?)",
    ],
  },
  {
    name: "v4 — Production",
    scope: "Client projects and organizational systems",
    includes: [
      "Everything in v3",
      "Prior context chain (full history of related work)",
      "Stakeholder map (who needs to approve what?)",
      "Incident response notes",
      "Handoff documentation",
    ],
  },
] as const;

export default function ContextPackResourcePage() {
  const [unlocked, setUnlocked] = useState(false);

  return (
    <PageShell
      title="The Context Pack Template Kit"
      subtitle="The document that makes AI agents useful. Four templates. One example. Free."
      breadcrumbs={[{ label: "Resources", href: "/resources" }, { label: "Context Pack" }]}
    >
      {/* Intro */}
      <section className="mt-4">
        <Card className="p-5">
          <p className="type-body-sm text-text-secondary">
            The Context Pack is your operating document for AI-assisted work. It tells both human
            collaborators and AI agents what they need to know about your project \u2014 scope, domain,
            constraints, evaluation criteria, and prior context.
          </p>
          <p className="type-body-sm mt-3 text-text-secondary">
            This kit includes templates for four levels of complexity, plus a real example from a
            production project with annotations explaining each section.
          </p>
          <div className="mt-3 flex items-center gap-3">
            <Badge variant="secondary">Templates</Badge>
            <span className="type-meta text-text-muted">ZIP \u2022 6 files (4 templates + example + README)</span>
          </div>
        </Card>
      </section>

      {/* Templates breakdown */}
      <section className="mt-8">
        <h2 className="type-title text-text-primary">Four levels of complexity</h2>
        <p className="mt-1 type-meta text-text-muted">Start with v1 and grow as your projects demand more structure.</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {templates.map((t) => (
            <Card key={t.name} className="p-4">
              <div className="flex items-center gap-2">
                <h3 className="type-label text-text-primary">{t.name}</h3>
                <span className="type-meta text-text-muted">\u2014 {t.scope}</span>
              </div>
              <ul className="mt-3 space-y-1">
                {t.includes.map((item) => (
                  <li key={item} className="type-meta text-text-secondary">\u2022 {item}</li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      </section>

      {/* Example teaser */}
      <section className="mt-8">
        <h2 className="type-title text-text-primary">Plus: a real-world example</h2>
        <Card className="mt-4 p-5">
          <p className="type-body-sm text-text-secondary">
            A completed v2 Context Pack for adding full-text search to an event management system \u2014
            filled in with realistic content and annotations explaining each section\u2019s purpose. 200 words
            that tell an AI everything it needs to build the feature correctly.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge variant="outline">Next.js App Router</Badge>
            <Badge variant="outline">SQLite FTS5</Badge>
            <Badge variant="outline">Server Components</Badge>
            <Badge variant="outline">Parameterized queries</Badge>
          </div>
        </Card>
      </section>

      {/* Email gate */}
      <section className="mt-8" id="download">
        {unlocked ? (
          <Card className="p-5 text-center">
            <h3 className="type-title text-text-primary">Download ready</h3>
            <p className="mt-2 type-body-sm text-text-secondary">
              The Context Pack Template Kit is available for download. A copy has also been sent to your email.
            </p>
            <a
              href="/resources/context-pack-kit.zip"
              className="mt-4 inline-block rounded-sm border border-action-primary bg-action-primary px-4 py-2 type-label text-text-inverse hover:bg-action-primary-hover"
              download
            >
              Download Kit
            </a>
          </Card>
        ) : (
          <EmailCapture
            source="context-pack"
            headline="Get the Context Pack Template Kit"
            description="Enter your email to download the ZIP. You\u2019ll also receive the Ordo Brief \u2014 a short newsletter covering models, money, people, and what to do next."
            ctaLabel="Download Kit"
            pagePath="/resources/context-pack"
            onSuccess={() => setUnlocked(true)}
          />
        )}
      </section>

      {/* Who this is for */}
      <section className="mt-8 mb-4">
        <Card className="p-5">
          <h2 className="type-title text-text-primary">Who this is for</h2>
          <ul className="mt-3 space-y-2 type-body-sm text-text-secondary">
            <li>\u2022 <strong>Engineering managers</strong> who want a standard format for AI-assisted project work</li>
            <li>\u2022 <strong>Team leads</strong> who need their teams writing better AI prompts immediately</li>
            <li>\u2022 <strong>Individual contributors</strong> who want to produce better AI output on their next feature</li>
          </ul>
        </Card>
      </section>
    </PageShell>
  );
}
