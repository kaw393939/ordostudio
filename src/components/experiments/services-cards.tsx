"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/primitives";
import { useFeatureFlag } from "@/components/feature-flags-provider";

type CardKey = "workshop" | "team-program" | "advisory";

const OfferCard = ({ kind }: { kind: CardKey }) => {
  if (kind === "workshop") {
    return (
      <Card className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="type-title text-text-primary">Workshop</h2>
            <p className="mt-1 type-body-sm text-text-secondary">One day. High-signal method + templates.</p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge variant="secondary">CTO/Eng Manager</Badge>
          <Badge variant="outline">Individuals</Badge>
        </div>

        <div className="mt-4">
          <p className="type-label text-text-primary">What you get</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 type-body-sm text-text-secondary">
            <li>Ordo spec template pack</li>
            <li>Review rubric + evaluation checklist</li>
            <li>Team workflow map for safe AI use</li>
          </ul>
        </div>

        <div className="mt-4">
          <p className="type-label text-text-primary">What changes</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 type-body-sm text-text-secondary">
            <li>Less ambiguity in delivery decisions</li>
            <li>More consistent output under AI acceleration</li>
          </ul>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Link href="/services/workshop" className="type-label underline">
            View details
          </Link>
          <Link
            href="/services/request?offer=workshop"
            data-measure-key="CTA_CLICK_BOOK_TECHNICAL_CONSULT"
            className="type-label underline"
          >
            Book a technical consult
          </Link>
        </div>
      </Card>
    );
  }

  if (kind === "team-program") {
    return (
      <Card className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="type-title text-text-primary">Team program</h2>
            <p className="mt-1 type-body-sm text-text-secondary">4–6 weeks. Standards, evaluation, adoption.</p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge variant="secondary">CTO/Eng Manager</Badge>
          <Badge variant="secondary">Teams</Badge>
        </div>

        <div className="mt-4">
          <p className="type-label text-text-primary">What you get</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 type-body-sm text-text-secondary">
            <li>Standard prompts + review conventions</li>
            <li>Evaluation gates for core workflows</li>
            <li>Adoption plan + role-based enablement</li>
          </ul>
        </div>

        <div className="mt-4">
          <p className="type-label text-text-primary">What changes</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 type-body-sm text-text-secondary">
            <li>Reduced shadow AI practices</li>
            <li>More predictable throughput and quality</li>
          </ul>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Link href="/services/team-program" className="type-label underline">
            View details
          </Link>
          <Link
            href="/services/request?offer=team-program"
            data-measure-key="CTA_CLICK_BOOK_TECHNICAL_CONSULT"
            className="type-label underline"
          >
            Book a technical consult
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="type-title text-text-primary">Advisory / enablement</h2>
          <p className="mt-1 type-body-sm text-text-secondary">Operating system design for AI delivery.</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Badge variant="secondary">CTO/Eng Manager</Badge>
        <Badge variant="outline">Individuals</Badge>
      </div>

      <div className="mt-4">
        <p className="type-label text-text-primary">What you get</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 type-body-sm text-text-secondary">
          <li>Workflow and quality gates tailored to your stack</li>
          <li>Risk review: governance, safety, evaluation</li>
          <li>Playbooks your team can run without a hero</li>
        </ul>
      </div>

      <div className="mt-4">
        <p className="type-label text-text-primary">What changes</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 type-body-sm text-text-secondary">
          <li>Clear standards that survive tool churn</li>
          <li>Fewer production surprises from AI output</li>
        </ul>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Link href="/services/advisory" className="type-label underline">
          View details
        </Link>
        <Link
          href="/services/request?offer=advisory"
          data-measure-key="CTA_CLICK_BOOK_TECHNICAL_CONSULT"
          className="type-label underline"
        >
          Book a technical consult
        </Link>
      </div>
    </Card>
  );
};

export function ServicesCards() {
  const orderAlt = useFeatureFlag("EXP_SERVICES_CARD_ORDER_ALT");
  const order: CardKey[] = orderAlt ? ["advisory", "team-program", "workshop"] : ["workshop", "team-program", "advisory"];

  return (
    <section className="grid gap-3 lg:grid-cols-3">
      {order.map((kind) => (
        <OfferCard key={kind} kind={kind} />
      ))}
    </section>
  );
}
