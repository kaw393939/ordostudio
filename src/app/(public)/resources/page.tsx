import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { Card } from "@/components/primitives";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Resources \u2022 Studio Ordo",
  description:
    "Free tools for the AI era: the Spell Book vocabulary guide, Context Pack templates, and the Human Edge Scorecard.",
  openGraph: {
    title: "Resources \u2022 Studio Ordo",
    description:
      "Free tools for the AI era: the Spell Book vocabulary guide, Context Pack templates, and the Human Edge Scorecard.",
  },
  alternates: {
    canonical: "/resources",
  },
};

const resources = [
  {
    slug: "spell-book",
    title: "The Spell Book",
    subtitle: "40 Terms Every AI-Capable Engineer Knows",
    description:
      "Professional vocabulary creates precision. Precision creates communication. This PDF contains 40 terms organized in 5 categories \u2014 Foundations, Inquiry & Judgment, Resilience & Systems, Data & Evaluation, and Leadership & Translation \u2014 each with a working definition, why it matters, and how it appears in practice.",
    format: "PDF \u2022 12\u201316 pages",
    audience: "Individual contributors",
    badge: "Vocabulary",
  },
  {
    slug: "context-pack",
    title: "The Context Pack Template Kit",
    subtitle: "The document that makes AI agents useful",
    description:
      "Four templates at increasing levels of complexity \u2014 from a starter brief for individual projects to a production-grade Context Pack for client work. Includes a completed real-world example with annotations explaining each section.",
    format: "ZIP \u2022 6 files (4 templates + example + README)",
    audience: "Engineering managers & teams",
    badge: "Templates",
  },
  {
    slug: "assessment",
    title: "The Human Edge Scorecard",
    subtitle: "AI Readiness Assessment",
    description:
      "Rate your current capability across the 8 Human Edge dimensions. Five minutes produces a personalized profile with your strongest capability, development priority, and a recommended next step mapped to Studio Ordo\u2019s training tracks.",
    format: "Interactive \u2022 5 minutes",
    audience: "All roles",
    badge: "Assessment",
  },
] as const;

export default function ResourcesPage() {
  return (
    <PageShell
      title="Resources"
      subtitle="Professional tools for the AI era. Each one is free. The exchange is fair: your email for something you\u2019ll actually use."
    >
      <section className="mt-6 grid gap-6 md:grid-cols-3">
        {resources.map((r) => (
          <Link key={r.slug} href={`/resources/${r.slug}`} className="group">
            <Card className="flex h-full flex-col p-5 transition-shadow group-hover:shadow-md">
              <div className="mb-3 flex items-center gap-2">
                <Badge variant="secondary">{r.badge}</Badge>
                <span className="type-meta text-text-muted">{r.format}</span>
              </div>
              <h2 className="type-title text-text-primary">{r.title}</h2>
              <p className="type-label mt-1 text-text-secondary">{r.subtitle}</p>
              <p className="type-body-sm mt-3 flex-1 text-text-muted">{r.description}</p>
              <div className="mt-4 flex items-center justify-between">
                <span className="type-meta text-text-muted">{r.audience}</span>
                <span className="type-label text-action-primary group-hover:underline">Get it free \u2192</span>
              </div>
            </Card>
          </Link>
        ))}
      </section>

      {/* Funnel context */}
      <section className="mt-12 rounded-sm border border-border-default p-6 text-center">
        <h2 className="type-title text-text-primary">How it works</h2>
        <p className="type-body-sm mx-auto mt-2 max-w-lg text-text-secondary">
          Enter your email. Get the resource instantly. You\u2019ll also receive the Ordo Brief \u2014
          a short newsletter covering models, money, people, and what to do next. Unsubscribe anytime.
        </p>
      </section>
    </PageShell>
  );
}
