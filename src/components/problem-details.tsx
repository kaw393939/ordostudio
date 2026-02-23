"use client";

import Link from "next/link";
import { useState } from "react";
import type { ProblemDetails } from "@/lib/hal-client";
import { ErrorState } from "@/components/patterns";
import { Button } from "@/components/primitives";
import { toProblemRecoveryView } from "@/lib/problem-recovery-ui";

type ProblemDetailsProps = {
  problem: ProblemDetails;
  onRetry?: () => void;
};

export function ProblemDetailsPanel({ problem, onRetry }: ProblemDetailsProps) {
  const [copied, setCopied] = useState(false);
  const recovery = toProblemRecoveryView(problem);

  const onCopy = async () => {
    if (!problem.request_id) {
      return;
    }

    try {
      await navigator.clipboard.writeText(problem.request_id);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  };

  const triggerRetry = () => {
    if (onRetry) {
      onRetry();
      return;
    }

    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  return (
    <div className="space-y-3">
      <ErrorState
        title={recovery.title}
        description={recovery.cause}
        supportCode={problem.request_id}
        action={
          <div className="flex flex-wrap items-center gap-2">
            {recovery.actions.map((action) => {
              if (action.kind === "retry") {
                return (
                  <Button key={action.kind} type="button" intent="secondary" onClick={triggerRetry}>
                    {action.label}
                  </Button>
                );
              }

              if (action.href) {
                return (
                  <Link key={action.kind} href={action.href} className="type-label underline">
                    {action.label}
                  </Link>
                );
              }

              return (
                <p key={action.kind} className="type-meta text-text-muted">
                  {action.label}
                </p>
              );
            })}

            {problem.request_id ? (
              <button
                type="button"
                onClick={() => void onCopy()}
                className="motion-base rounded-sm border border-border-default bg-action-secondary px-2 py-1 type-label text-text-primary hover:bg-action-secondary-hover"
              >
                {copied ? "Copied" : "Copy support code"}
              </button>
            ) : null}
          </div>
        }
      />
      {Array.isArray(problem.errors) && problem.errors.length > 0 ? (
        <ul className="surface p-4 list-disc pl-5 type-body-sm text-text-secondary">
          {problem.errors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
