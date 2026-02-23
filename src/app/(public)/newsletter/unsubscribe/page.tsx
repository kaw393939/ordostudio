"use client";

import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { PageShell } from "@/components/layout/page-shell";
import { Button, Card } from "@/components/primitives";
import { ProblemDetailsPanel } from "@/components/problem-details";
import { requestHal, type ProblemDetails } from "@/lib/hal-client";

export default function NewsletterUnsubscribePage() {
  const searchParams = useSearchParams();
  const token = useMemo(() => searchParams.get("token") ?? "", [searchParams]);

  const [pending, setPending] = useState(false);
  const [problem, setProblem] = useState<ProblemDetails | null>(null);
  const [done, setDone] = useState(false);

  const onConfirm = async () => {
    setPending(true);
    setProblem(null);

    const result = await requestHal<{ ok: true }>("/api/v1/newsletter/unsubscribe", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token }),
    });

    if (!result.ok) {
      setProblem(result.problem);
      setPending(false);
      return;
    }

    setDone(true);
    setPending(false);
  };

  return (
    <PageShell title="Unsubscribe" subtitle="Confirm to stop receiving future issues.">
      {problem ? (
        <div className="mt-4">
          <ProblemDetailsPanel problem={problem} />
        </div>
      ) : null}

      <Card className="mt-4 p-4">
        {done ? (
          <>
            <h2 className="type-title">You’re unsubscribed</h2>
            <p className="mt-1 type-meta text-text-muted">No further emails will be sent to this address.</p>
          </>
        ) : (
          <>
            <h2 className="type-title">Confirm unsubscribe</h2>
            <p className="mt-1 type-meta text-text-muted">This will take effect immediately.</p>
            <div className="mt-3">
              <Button intent="primary" onClick={() => void onConfirm()} disabled={pending || token.trim().length === 0}>
                {pending ? "Unsubscribing…" : "Unsubscribe"}
              </Button>
            </div>
          </>
        )}
      </Card>
    </PageShell>
  );
}
