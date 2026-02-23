import type { Metadata } from "next";
import Link from "next/link";

import { PageShell } from "@/components/layout/page-shell";
import { Card } from "@/components/primitives";

export const metadata: Metadata = {
  title: "Affiliates • Studio Ordo",
  description: "Share Studio Ordo with your network and earn commissions through tracked referrals.",
  alternates: { canonical: "/affiliate" },
};

export default function AffiliatePage() {
  return (
    <PageShell
      title="Affiliate program"
      subtitle="Share Studio Ordo with your network. Get attribution. Get paid."
      breadcrumbs={[{ label: "Affiliate" }]}
    >
      <section className="surface p-6">
        <h2 className="type-title text-text-primary">How it works</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 type-body-sm text-text-secondary">
          <li>Sign up (or sign in) and open your dashboard.</li>
          <li>Copy your referral link and share it where it’s relevant.</li>
          <li>We track attribution and show your status and payouts in one place.</li>
        </ol>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Link
            href="/account"
            className="motion-base rounded-sm border border-action-primary bg-action-primary px-3 py-2 type-label text-text-inverse hover:bg-action-primary-hover"
          >
            Open my dashboard
          </Link>
          <Link href="/register" className="type-label underline">
            Create an account
          </Link>
        </div>
      </section>

      <section className="mt-6 grid gap-3 md:grid-cols-2">
        <Card className="p-4">
          <h2 className="type-title text-text-primary">What to share</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 type-body-sm text-text-secondary">
            <li>Events and workshops that match your audience.</li>
            <li>The Studio model (learn by shipping, judged by artifacts).</li>
            <li>Newsletter issues that your audience would actually read.</li>
          </ul>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Link href="/events" className="type-label underline">
              Browse events
            </Link>
            <Link href="/studio" className="type-label underline">
              Explore the Studio
            </Link>
          </div>
        </Card>

        <Card className="p-4">
          <h2 className="type-title text-text-primary">Rules of the road</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 type-body-sm text-text-secondary">
            <li>No hype claims. Prefer proof, artifacts, and numbers.</li>
            <li>Don’t spam. Share where it’s genuinely useful.</li>
            <li>If you have a question about attribution, use the dashboard status first.</li>
          </ul>
          <p className="mt-3 type-meta text-text-muted">We optimize for trust and long-term reputation.</p>
        </Card>
      </section>
    </PageShell>
  );
}
