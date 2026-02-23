"use client";

import { ProblemDetailsPanel } from "@/components/problem-details";
import { PageShell } from "@/components/layout/page-shell";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <PageShell title="Admin error" subtitle="The admin console hit an error.">
      <ProblemDetailsPanel
        problem={{
          type: "about:blank",
          title: "Unexpected Error",
          status: 500,
          detail: error.message || "Unexpected error.",
          request_id: error.digest,
        }}
        onRetry={reset}
      />
    </PageShell>
  );
}
