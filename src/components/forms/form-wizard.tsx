"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/ui/cn";

export type WizardStep = {
  id: string;
  label: string;
  content: React.ReactNode;
  /** Return true if step data is valid and we can proceed. */
  validate: () => Promise<boolean>;
};

type FormWizardProps = {
  steps: WizardStep[];
  storageKey: string;
  onComplete: () => void;
  className?: string;
};

function getStoredStep(key: string): number {
  try {
    const raw = sessionStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed.currentStep === "number") return parsed.currentStep;
    }
  } catch {
    /* ignore */
  }
  return 0;
}

/**
 * Multi-step form wizard with step indicator, per-step validation,
 * back/next/submit navigation, and session-storage persistence.
 */
export function FormWizard({
  steps,
  storageKey,
  onComplete,
  className,
}: FormWizardProps) {
  const [currentStep, setCurrentStep] = React.useState(() =>
    getStoredStep(storageKey)
  );

  const isFirst = currentStep === 0;
  const isLast = currentStep === steps.length - 1;

  // Persist step to session storage
  React.useEffect(() => {
    sessionStorage.setItem(storageKey, JSON.stringify({ currentStep }));
  }, [currentStep, storageKey]);

  const goNext = React.useCallback(async () => {
    const valid = await steps[currentStep].validate();
    if (!valid) return;
    setCurrentStep((s) => Math.min(s + 1, steps.length - 1));
  }, [currentStep, steps]);

  const goBack = React.useCallback(() => {
    setCurrentStep((s) => Math.max(s - 1, 0));
  }, []);

  const handleComplete = React.useCallback(() => {
    onComplete();
    sessionStorage.removeItem(storageKey);
  }, [onComplete, storageKey]);

  return (
    <div className={cn("space-y-6", className)}>
      {/* Step indicator */}
      <nav aria-label="Form steps" className="flex gap-2">
        {steps.map((step, i) => (
          <div
            key={step.id}
            data-active={i === currentStep ? "true" : "false"}
            className={cn(
              "flex-1 rounded-md border px-3 py-2 text-center text-sm",
              i === currentStep
                ? "border-primary bg-primary/10 font-semibold text-primary"
                : i < currentStep
                  ? "border-muted bg-muted text-muted-foreground"
                  : "border-border text-muted-foreground"
            )}
          >
            {step.label}
          </div>
        ))}
      </nav>

      {/* Step content */}
      <div>{steps[currentStep].content}</div>

      {/* Navigation */}
      <div className="flex justify-between">
        {!isFirst ? (
          <Button variant="outline" onClick={goBack}>
            Back
          </Button>
        ) : (
          <div />
        )}

        {isLast ? (
          <Button onClick={handleComplete}>Submit</Button>
        ) : (
          <Button onClick={() => void goNext()}>Next</Button>
        )}
      </div>
    </div>
  );
}
