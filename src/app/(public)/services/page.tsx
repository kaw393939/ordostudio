import type { Metadata } from "next";
import { PageShell } from "@/components/layout/page-shell";
import { ServicesCards } from "@/components/experiments/services-cards";

export const metadata: Metadata = {
  title: "Training • Studio Ordo",
  description: "Training tracks for every stage of AI capability. Workshops, team programs, and advisory engagements.",
  openGraph: {
    title: "Training • Studio Ordo",
    description: "Training tracks for every stage of AI capability. Workshops, team programs, and advisory engagements.",
  },
  alternates: {
    canonical: "/services",
  },
};

export default function ServicesPage() {
  return (
    <PageShell
      title="Training"
      subtitle="Training tracks for every stage of AI capability. All built on the same spec-driven method, all producing artifacts that prove how your people work."
    >
      <ServicesCards />

      <section className="mt-6 surface p-6">
        <h2 className="type-title text-text-primary">Spell Book Terms by Track</h2>
        <p className="mt-2 type-body-sm text-text-secondary">
          Each track introduces professional vocabulary that becomes your team&apos;s shared language:
        </p>
        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          <div className="surface-elevated p-4">
            <p className="type-label text-text-primary">Workshop (single)</p>
            <p className="mt-1 type-meta text-text-secondary">~8 terms per session</p>
          </div>
          <div className="surface-elevated p-4">
            <p className="type-label text-text-primary">Team Program</p>
            <p className="mt-1 type-meta text-text-secondary">40+ terms across 6 weeks</p>
          </div>
          <div className="surface-elevated p-4">
            <p className="type-label text-text-primary">Advisory</p>
            <p className="mt-1 type-meta text-text-secondary">Full 60-term professional vocabulary</p>
          </div>
        </div>
      </section>

      <section className="mt-6 surface-elevated p-6 text-center">
        <p className="type-body-sm text-text-secondary">
          Not sure which track fits? Book a 30-minute technical consult. No pitch deck. We&apos;ll discuss your
          team&apos;s current state and recommend a starting point.
        </p>
      </section>
    </PageShell>
  );
}
