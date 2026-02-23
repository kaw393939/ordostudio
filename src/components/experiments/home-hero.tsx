"use client";

import Link from "next/link";
import { useFeatureFlag } from "@/components/feature-flags-provider";

export function HomeHero() {
  const copyV2 = useFeatureFlag("EXP_HOME_HERO_COPY_V2");
  const consultPrimary = useFeatureFlag("EXP_HOME_PRIMARY_CTA_CONSULT");

  const headline = copyV2 ? "Turn AI speed into reliable delivery." : "Bring order to AI in software delivery.";
  const subhead = copyV2
    ? "A practical workflow for specs, tests, and evaluation gates — taught through training tracks and apprenticeship."
    : "Training and apprenticeship for engineers and teams — grounded in specs, tests, and evaluation gates.";

  const trainingCta = (
    <Link
      href="/services"
      data-measure-key="CTA_CLICK_VIEW_TRAINING_TRACKS"
      className={
        consultPrimary
          ? "motion-base rounded-sm border border-border-default bg-action-secondary px-3 py-2 type-label text-text-primary hover:bg-action-secondary-hover"
          : "motion-base rounded-sm border border-action-primary bg-action-primary px-3 py-2 type-label text-text-inverse hover:bg-action-primary-hover"
      }
    >
      View training tracks
    </Link>
  );

  const consultCta = (
    <Link
      href="/services/request"
      data-measure-key="CTA_CLICK_BOOK_TECHNICAL_CONSULT"
      className={
        consultPrimary
          ? "motion-base rounded-sm border border-action-primary bg-action-primary px-3 py-2 type-label text-text-inverse hover:bg-action-primary-hover"
          : "motion-base rounded-sm border border-border-default bg-action-secondary px-3 py-2 type-label text-text-primary hover:bg-action-secondary-hover"
      }
    >
      Book a technical consult
    </Link>
  );

  return (
    <section className="surface-elevated p-6">
      <p className="type-meta text-text-muted">Studio Ordo</p>
      <h1 className="mt-2 type-h2 text-text-primary">{headline}</h1>
      <p className="type-body mt-3 text-text-secondary">{subhead}</p>
      <p className="mt-3 type-meta text-text-muted">20+ years teaching engineers · 10,000+ students</p>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        {consultPrimary ? (
          <>
            {consultCta}
            {trainingCta}
          </>
        ) : (
          <>
            {trainingCta}
            {consultCta}
          </>
        )}
        <Link href="/studio" className="type-label underline">
          Join the studio
        </Link>
      </div>
    </section>
  );
}
