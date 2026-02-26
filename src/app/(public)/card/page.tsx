"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/primitives/button";

function CardContent() {
  const searchParams = useSearchParams();
  const ref = searchParams.get("ref");
  const [affiliateName, setAffiliateName] = useState<string | null>(null);

  useEffect(() => {
    if (!ref) return;
    // Set so_ref cookie (belt-and-suspenders alongside /r/[code])
    document.cookie = `so_ref=${encodeURIComponent(ref.toUpperCase())}; Max-Age=${90 * 86400}; Path=/; SameSite=Lax`;
    // Resolve affiliate display name (best-effort)
    void (async () => {
      try {
        const res = await fetch(`/api/v1/referrals/resolve?code=${encodeURIComponent(ref)}`);
        if (res.ok) {
          const data = (await res.json()) as { display_name?: string };
          if (data.display_name) setAffiliateName(data.display_name);
        }
      } catch {
        // silent — attribution line simply won't render
      }
    })();
  }, [ref]);

  return (
    <main id="main-content" className="container-grid py-6">
      {/* Above fold */}
      <section className="surface p-6">
        <h1 className="type-title text-text-primary">
          You&apos;re holding a Studio Ordo card.
        </h1>
        <p className="mt-2 type-body-sm text-text-secondary">
          We build software. We train the people who direct AI.
        </p>
        {affiliateName && (
          <p className="mt-2 type-meta text-text-muted">
            You were referred by {affiliateName}.
          </p>
        )}
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <Button asChild intent="primary">
            <Link href="/services/request">Commission a project →</Link>
          </Button>
          <Link href="/maestro" className="type-label underline self-center">
            Learn the method →
          </Link>
        </div>
      </section>

      {/* Below fold */}
      <section className="mt-6 surface p-6">
        <p className="type-body-sm text-text-secondary">
          The business card you&apos;re holding belongs to a Studio Ordo member — an
          engineer, practitioner, or Affiliate in our guild.
        </p>
        <p className="mt-3 type-body-sm text-text-secondary">
          Studio Ordo builds software using a spec-driven method with AI-capable
          engineers. We also train professionals to direct AI in their own work.
        </p>
        <p className="mt-3 type-meta text-text-muted">
          23 years teaching engineers. 10,000+ trained.
        </p>
      </section>
    </main>
  );
}

export default function CardPage() {
  return (
    <Suspense>
      <CardContent />
    </Suspense>
  );
}
