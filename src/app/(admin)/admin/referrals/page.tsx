"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { PageShell } from "@/components/layout/page-shell";
import { Button, Card } from "@/components/primitives";
import { ProblemDetailsPanel } from "@/components/problem-details";
import { formatCents } from "@/lib/currency";
import { requestHal, type ProblemDetails } from "@/lib/hal-client";

type ReferralAdminRow = {
  user_email: string;
  code: string;
  clicks: number;
  conversions: number;
  conversion_rate: number;
  gross_accepted_cents: number;
  commission_owed_cents: number;
};

type ReferralAdminReport = {
  totals: {
    members: number;
    clicks: number;
    conversions: number;
    gross_accepted_cents: number;
    commission_owed_cents: number;
  };
  items: ReferralAdminRow[];
};

const formatPercent = (value: number): string => {
  return `${Math.round(value * 1000) / 10}%`;
};

export default function AdminReferralsPage() {
  const [report, setReport] = useState<ReferralAdminReport | null>(null);
  const [pending, setPending] = useState(true);
  const [problem, setProblem] = useState<ProblemDetails | null>(null);

  const load = useCallback(async () => {
    setPending(true);
    const result = await requestHal<ReferralAdminReport>("/api/v1/admin/referrals");
    if (!result.ok) {
      setProblem(result.problem);
      setReport(null);
      setPending(false);
      return;
    }

    setProblem(null);
    setReport(result.data);
    setPending(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const totals = report?.totals ?? null;

  const rows = useMemo(() => report?.items ?? [], [report]);

  return (
    <PageShell title="Referrals" subtitle="Click/conversion attribution and commission reporting.">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button intent="secondary" onClick={() => void load()} disabled={pending}>
          Refresh
        </Button>
        <Link href="/api/v1/admin/referrals/export" className="type-label underline">
          Export CSV
        </Link>
      </div>

      {problem ? (
        <div className="mt-4">
          <ProblemDetailsPanel problem={problem} />
        </div>
      ) : null}

      {pending ? <p className="mt-4 type-meta text-text-muted">Loading…</p> : null}

      {totals ? (
        <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <Card className="p-4">
            <p className="type-meta text-text-muted">Members</p>
            <p className="mt-1 text-2xl font-semibold">{totals.members}</p>
          </Card>
          <Card className="p-4">
            <p className="type-meta text-text-muted">Clicks</p>
            <p className="mt-1 text-2xl font-semibold">{totals.clicks}</p>
          </Card>
          <Card className="p-4">
            <p className="type-meta text-text-muted">Conversions</p>
            <p className="mt-1 text-2xl font-semibold">{totals.conversions}</p>
          </Card>
          <Card className="p-4">
            <p className="type-meta text-text-muted">Commission owed (25%)</p>
            <p className="mt-1 text-2xl font-semibold">{formatCents(totals.commission_owed_cents)}</p>
          </Card>
        </div>
      ) : null}

      {report ? (
        <Card className="mt-4 p-4">
          <h2 className="type-title">Detail</h2>
          <p className="mt-1 type-body-sm text-text-secondary">
            Commission owed is calculated as 25% of accepted proposal amounts linked to attributed intake requests.
          </p>

          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-sm" aria-label="Referral reporting table">
              <thead>
                <tr>
                  <th scope="col" className="pb-2">Member</th>
                  <th scope="col" className="pb-2">Code</th>
                  <th scope="col" className="pb-2">Clicks</th>
                  <th scope="col" className="pb-2">Conversions</th>
                  <th scope="col" className="pb-2">Rate</th>
                  <th scope="col" className="pb-2">Commission owed</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-3 type-meta text-text-muted">
                      No referral codes yet.
                    </td>
                  </tr>
                ) : null}

                {rows.map((row) => (
                  <tr key={`${row.user_email}-${row.code}`} className="border-t border-border-default">
                    <td className="py-2 pr-3">
                      <span className="type-meta text-text-secondary">{row.user_email}</span>
                    </td>
                    <td className="py-2 pr-3">
                      <span className="type-meta text-text-secondary">{row.code}</span>
                    </td>
                    <td className="py-2 pr-3">
                      <span className="type-meta text-text-secondary">{row.clicks}</span>
                    </td>
                    <td className="py-2 pr-3">
                      <span className="type-meta text-text-secondary">{row.conversions}</span>
                    </td>
                    <td className="py-2 pr-3">
                      <span className="type-meta text-text-secondary">{formatPercent(row.conversion_rate)}</span>
                    </td>
                    <td className="py-2">
                      <span className="type-meta text-text-secondary">{formatCents(row.commission_owed_cents)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}
    </PageShell>
  );
}
