"use client";

import { useEffect } from "react";
import { ProblemDetailsPanel } from "@/components/problem-details";
import { PageShell } from "@/components/layout/page-shell";
import type { ProblemDetails } from "@/lib/hal-client";

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[admin error boundary]", error);
  }, [error]);

  const problem: ProblemDetails = {
    type: "https://lms-219.dev/problems/internal",
    title: "Something went wrong",
    status: 500,
    detail: error.message || "An unexpected error occurred in the admin area.",
    request_id: error.digest,
  };

  return (
    <PageShell title="Admin error" subtitle="An error occurred while loading this page.">
      <ProblemDetailsPanel problem={problem} onRetry={reset} />
    </PageShell>
  );
}
