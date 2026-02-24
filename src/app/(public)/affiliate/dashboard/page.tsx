"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageShell } from "@/components/layout/page-shell";
import { Card } from "@/components/primitives";
import { requestHal } from "@/lib/hal-client";

type MeResponse = {
  id: string;
  email: string;
  status: string;
  roles: string[];
};

export default function AffiliateDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const res = await requestHal<MeResponse>("/api/v1/me");
      if (!res.ok) {
        router.push("/login?next=/affiliate/dashboard");
        return;
      }

      const roles = res.data.roles || [];
      if (!roles.includes("AFFILIATE") && !roles.includes("ADMIN") && !roles.includes("SUPER_ADMIN")) {
        router.push("/dashboard");
        return;
      }

      setUser(res.data);
      setLoading(false);
    };
    void load();
  }, [router]);

  if (loading || !user) {
    return (
      <PageShell title="Affiliate Dashboard" subtitle="Loading...">
        <div className="p-6">Loading...</div>
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Affiliate Dashboard"
      subtitle="Manage your referrals and track your commissions."
      breadcrumbs={[{ label: "Affiliate", href: "/affiliate" }, { label: "Dashboard" }]}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-6">
          <h2 className="type-title">Your Referral Link</h2>
          <p className="mt-2 type-body-sm text-text-secondary">
            Share this link to earn commissions on qualifying purchases.
          </p>
          <div className="mt-4 rounded-md bg-surface-sunken p-3 font-mono text-sm">
            https://lms-219.dev/?ref={user.id.split("-")[0]}
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="type-title">Stats</h2>
          <dl className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <dt className="type-meta text-text-muted">Clicks</dt>
              <dd className="mt-1 text-2xl font-semibold">0</dd>
            </div>
            <div>
              <dt className="type-meta text-text-muted">Conversions</dt>
              <dd className="mt-1 text-2xl font-semibold">0</dd>
            </div>
            <div>
              <dt className="type-meta text-text-muted">Pending Payout</dt>
              <dd className="mt-1 text-2xl font-semibold">$0.00</dd>
            </div>
            <div>
              <dt className="type-meta text-text-muted">Total Earned</dt>
              <dd className="mt-1 text-2xl font-semibold">$0.00</dd>
            </div>
          </dl>
        </Card>
      </div>
    </PageShell>
  );
}
