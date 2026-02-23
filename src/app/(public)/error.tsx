"use client";

import { ProblemDetailsPanel } from "@/components/problem-details";
import { PageShell } from "@/components/layout/page-shell";

export default function PublicError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <PageShell title="Something went wrong" subtitle="We hit a problem loading this page.">
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
