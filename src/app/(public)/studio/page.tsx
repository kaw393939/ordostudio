import Link from "next/link";
import { Button } from "@/components/primitives/button";
import { buildMetadata } from "@/lib/metadata";

export const metadata = buildMetadata({
  title: "Studio",
  description:
    "AI-capable engineers. Spec-driven method. Audit-logged deliverables. Commission a project.",
  canonical: "/studio",
});

export default function StudioPage() {
  return (
    <main id="main-content" className="container-grid py-6">
      {/* Hero */}
      <section className="surface p-6">
        <h1 className="type-title text-text-primary">Commission a project.</h1>
        <p className="mt-2 type-body text-text-secondary">
          AI-capable engineers. Spec-driven method. Audit-logged deliverables.
        </p>
        <div className="mt-4 flex flex-col items-start gap-3">
          <Button asChild intent="primary">
            <Link href="/services/request">Start a project →</Link>
          </Button>
          <Link
            href="/join"
            className="type-meta text-text-muted hover:text-text-default transition-colors"
          >
            Not sure which path fits you? →
          </Link>
        </div>
      </section>

      {/* What We Build */}
      <section className="mt-6 surface p-6">
        <h2 className="type-section-title text-text-primary">What We Build</h2>
        <ul className="mt-3 space-y-1 type-body-sm text-text-secondary list-disc list-inside">
          <li>Line-of-business web applications</li>
          <li>Internal tooling and workflow automation</li>
          <li>AI-integrated features for existing products</li>
          <li>API development and system integrations</li>
          <li>Codebase audits and spec remediation</li>
        </ul>
      </section>

      {/* Who We Work With */}
      <section className="mt-6 surface p-6">
        <h2 className="type-section-title text-text-primary">Who We Work With</h2>
        <p className="mt-2 type-body-sm text-text-secondary">
          Engineering directors managing teams building AI-assisted software. CTOs who need a
          reliable external build partner. Product leads with a spec and a deadline.
        </p>
      </section>

      {/* Proof Point */}
      <div className="py-4 text-center">
        <p className="type-meta text-text-muted">
          23 years teaching engineers · 10,000+ trained · spec-driven from day one
        </p>
      </div>

      {/* How We Work */}
      <section className="surface p-6">
        <h2 className="type-section-title text-text-primary">How We Work</h2>
        <p className="mt-2 type-body-sm text-text-secondary">
          We spend 40% of every engagement in spec. That means requirements are locked before a
          line of code is written, and deliverables match what was agreed.
        </p>
        <p className="mt-3 type-body-sm text-text-secondary">
          The remaining 60% is build — AI-capable engineers working against a living spec
          document that you can audit at any point in the engagement.
        </p>
      </section>
    </main>
  );
}
