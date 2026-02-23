import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";

export const metadata: Metadata = {
  title: "Advisory \u2022 Training \u2022 Studio Ordo",
  description:
    "Advisory/Enablement: we build your AI operating system \u2014 workflow mapping, guardrails, playbooks, and training.",
  openGraph: {
    title: "Advisory \u2022 Training \u2022 Studio Ordo",
    description:
      "Advisory/Enablement: we build your AI operating system \u2014 workflow mapping, guardrails, playbooks, and training.",
  },
  alternates: {
    canonical: "/services/advisory",
  },
};

export default function AdvisoryPage() {
  return (
    <PageShell title="Advisory / Enablement" subtitle="We build your AI operating system.">
      {/* Overview */}
      <section className="surface p-6">
        <p className="type-body-sm text-text-secondary">
          Advisory engagements are 1&ndash;3 month embedded partnerships. We work with your team to map AI workflows,
          establish guardrails, build playbooks, and train your people &mdash; all within your existing delivery process.
        </p>
      </section>

      {/* What we build with you */}
      <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="surface p-6">
          <p className="type-label text-text-primary">Workflow Mapping</p>
          <p className="mt-2 type-body-sm text-text-secondary">
            Where AI accelerates and where manual judgment is required. We map your entire delivery process.
          </p>
        </div>
        <div className="surface p-6">
          <p className="type-label text-text-primary">Guardrail Design</p>
          <p className="mt-2 type-body-sm text-text-secondary">
            AI Audit Log templates, evaluation criteria, approval workflows. Accountability built into the process.
          </p>
        </div>
        <div className="surface p-6">
          <p className="type-label text-text-primary">Playbook Development</p>
          <p className="mt-2 type-body-sm text-text-secondary">
            Context Pack templates for your domain, prompt engineering standards, team operating procedures.
          </p>
        </div>
        <div className="surface p-6">
          <p className="type-label text-text-primary">Capability Training</p>
          <p className="mt-2 type-body-sm text-text-secondary">
            Targeted workshops integrated into your sprint cadence. Training happens inside the work, not alongside it.
          </p>
        </div>
        <div className="surface p-6">
          <p className="type-label text-text-primary">Measurement</p>
          <p className="mt-2 type-body-sm text-text-secondary">
            Team Readiness Assessment, delivery metrics, quality metrics. Evidence-based improvement tracking.
          </p>
        </div>
        <div className="surface p-6">
          <p className="type-label text-text-primary">Full Vocabulary</p>
          <p className="mt-2 type-body-sm text-text-secondary">
            Complete 60-term Spell Book integration. Your team develops a shared professional language for AI delivery.
          </p>
        </div>
      </section>

      {/* Who This Is For */}
      <section className="mt-6 surface p-6">
        <h2 className="type-title text-text-primary">Who this is for</h2>
        <p className="mt-2 type-body-sm text-text-secondary">
          Engineering leadership at organizations with 50+ developers deploying AI tools at scale. You need more than
          training &mdash; you need an operating system for AI-integrated delivery.
        </p>
      </section>

      {/* Pricing */}
      <section className="mt-6 surface p-6">
        <h2 className="type-title text-text-primary">Pricing</h2>
        <p className="mt-2 type-body-sm text-text-secondary">
          Custom engagement. Starting at $35,000/month.
        </p>
      </section>

      {/* FAQ */}
      <section className="mt-6 surface p-6">
        <h2 className="type-title text-text-primary">FAQ</h2>
        <div className="mt-4 space-y-4">
          <div>
            <p className="type-label text-text-primary">Do you implement tools?</p>
            <p className="mt-1 type-body-sm text-text-secondary">
              We design the method and guardrails. Tooling can be evaluated inside the method. We&apos;re vendor-agnostic.
            </p>
          </div>
          <div>
            <p className="type-label text-text-primary">Is this only for big companies?</p>
            <p className="mt-1 type-body-sm text-text-secondary">
              No. Advisory can be scoped for teams of any size based on constraints and goals.
            </p>
          </div>
          <div>
            <p className="type-label text-text-primary">What&apos;s the typical engagement timeline?</p>
            <p className="mt-1 type-body-sm text-text-secondary">
              1&ndash;3 months embedded. Month 1: mapping and design. Month 2: implementation and training. Month 3:
              measurement and handoff. Some organizations extend to 6 months for full transformation.
            </p>
          </div>
        </div>
      </section>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Link
          href="/services/request?offer=advisory"
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
