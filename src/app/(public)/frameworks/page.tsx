import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { Card } from "@/components/primitives";

export const metadata: Metadata = {
  title: "Frameworks — Studio Ordo",
  description:
    "Five proprietary frameworks that power every Studio Ordo engagement: Human Edge, Spell Book, Context Pack, 40/60 Method, and AI Audit Log.",
  openGraph: {
    title: "Frameworks — Studio Ordo",
    description:
      "Five proprietary frameworks that power every Studio Ordo engagement.",
  },
};

const frameworks = [
  {
    slug: "human-edge",
    title: "The Human Edge",
    icon: "🧠",
    description:
      "Eight capabilities that AI cannot replace — the skills that determine whether you direct the machine or the machine directs you.",
    cta: "Explore the 8 capabilities",
  },
  {
    slug: "spell-book",
    title: "The Spell Book",
    icon: "📖",
    description:
      "42 professional terms every AI-era engineer must know. A shared vocabulary that separates informed practitioners from prompt-and-pray operators.",
    cta: "Browse the glossary",
  },
  {
    slug: "context-pack",
    title: "The Context Pack",
    icon: "📦",
    description:
      "The 4-component model for assembling the right information before you direct an AI agent. The meta-skill of the AI era is context management.",
    cta: "Learn the method",
  },
  {
    slug: "forty-sixty",
    title: "The 40/60 Method",
    icon: "⚖️",
    description:
      "40% manual work builds judgment. 60% AI-directed work builds velocity. The ratio that produces engineers who can evaluate what the machine produces.",
    cta: "Understand the ratio",
  },
  {
    slug: "ai-audit-log",
    title: "The AI Audit Log",
    icon: "📋",
    description:
      "A decision trail for every AI interaction. Accept, modify, or reject — and document why. Accountability, quality control, compliance, and institutional learning.",
    cta: "See the template",
  },
];

export default function FrameworksHubPage() {
  return (
    <PageShell
      title="Frameworks"
      subtitle="These five frameworks power every Studio Ordo engagement — from community events to enterprise programs."
    >
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {frameworks.map((fw) => (
          <Link key={fw.slug} href={`/frameworks/${fw.slug}`}>
            <Card className="flex h-full flex-col p-4 transition-shadow hover:shadow-md">
              <div className="text-3xl">{fw.icon}</div>
              <h2 className="mt-2 type-title">{fw.title}</h2>
              <p className="mt-1 flex-1 type-body-sm text-text-secondary">
                {fw.description}
              </p>
              <p className="mt-3 type-meta text-action-primary font-medium">
                {fw.cta} →
              </p>
            </Card>
          </Link>
        ))}
      </div>

      <Card className="mt-8 p-4">
        <h2 className="type-title">How the frameworks connect</h2>
        <div className="mt-3 font-mono type-body-sm text-text-secondary leading-relaxed">
          <p>Human Edge (what to develop)</p>
          <p className="ml-4">↓</p>
          <p>Context Pack (how to work) ←→ Spell Book (shared vocabulary)</p>
          <p className="ml-4">↓</p>
          <p>40/60 Method (how to practice)</p>
          <p className="ml-4">↓</p>
          <p>AI Audit Log (how to stay accountable)</p>
        </div>
      </Card>
    </PageShell>
  );
}
