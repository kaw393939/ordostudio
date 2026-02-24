"use client";

import { AlertCircle } from "lucide-react";
import Link from "next/link";
import { Button, Card } from "@/components/primitives";

export default function GlobalErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  console.error("Global error", error);

  return (
    <main id="main-content" className="container-grid py-6">
      <Card className="p-6 text-center">
        <div className="mx-auto mb-3 inline-flex size-12 items-center justify-center rounded-sm border border-border-default bg-surface text-text-secondary">
          <AlertCircle className="size-5" />
        </div>
        <h1 className="type-title text-text-primary">Something went wrong</h1>
        <p className="type-body mt-2 text-text-secondary">
          An unexpected error occurred. You can retry, or return to a safe page.
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Button intent="primary" onClick={reset}>
            Try again
          </Button>
          <Link className="type-label underline" href="/">
            Go home
          </Link>
          <Link className="type-label underline" href="/admin">
            Go to admin
          </Link>
        </div>
      </Card>
    </main>
  );
}
