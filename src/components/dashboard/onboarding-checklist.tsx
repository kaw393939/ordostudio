"use client";

import Link from "next/link";
import { CheckCircle2, Circle } from "lucide-react";
import type { OnboardingProgress } from "@/lib/onboarding";

type OnboardingChecklistProps = {
  progress: OnboardingProgress;
  onDismiss?: () => void;
};

export function OnboardingChecklist({ progress, onDismiss }: OnboardingChecklistProps) {
  if (progress.complete) return null;

  const pct = Math.round((progress.completedSteps / progress.totalSteps) * 100);

  return (
    <section
      className="surface-elevated rounded-lg border border-border-default p-6"
      aria-label="Onboarding checklist"
    >
      <div className="flex items-center justify-between">
        <h2 className="type-title text-text-primary">Getting started</h2>
        {onDismiss ? (
          <button
            type="button"
            onClick={onDismiss}
            className="type-meta text-text-muted hover:text-text-secondary"
          >
            Dismiss
          </button>
        ) : null}
      </div>

      <p className="type-body-sm mt-1 text-text-secondary">
        {progress.completedSteps} of {progress.totalSteps} steps complete
      </p>

      {/* Progress bar */}
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-border-subtle">
        <div
          className="h-full rounded-full bg-action-primary motion-base"
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>

      {/* Step list */}
      <ul className="mt-4 space-y-3">
        {progress.steps.map((step) => (
          <li key={step.id} className="flex items-start gap-3">
            {step.completed ? (
              <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-state-success" />
            ) : (
              <Circle className="mt-0.5 size-5 shrink-0 text-border-default" />
            )}
            <div>
              <Link
                href={step.href}
                className={`type-label ${step.completed ? "text-text-muted line-through" : "text-text-primary hover:underline"}`}
              >
                {step.label}
              </Link>
              <p className="type-meta text-text-muted">{step.description}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
