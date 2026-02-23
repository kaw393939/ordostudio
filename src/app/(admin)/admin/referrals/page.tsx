"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { PageShell } from "@/components/layout/page-shell";
import { Button, Card } from "@/components/primitives";
import { ProblemDetailsPanel } from "@/components/problem-details";
import { Badge } from "@/components/ui/badge";
import { RelativeTime } from "@/components/forms";
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
  generated_at?: string;
};

const formatPercent = (value: number): string => {
  return `${Math.round(value * 1000) / 10}%`;
};

export default function AdminReferralsPage() {
  const [report, setReport] = useState<ReferralAdminReport | null>(null);
  const [pending, setPending] = useState(true);
  const [problem, setProblem] = useState<ProblemDetails | null>(null);
  const [focusedCode, setFocusedCode] = useState<string | null>(null);

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
    setFocusedCode((current) => {
      const nextItems = result.data.items ?? [];
      if (!current) {
        return nextItems.length > 0 ? nextItems[0].code : null;
      }
      return nextItems.some((row) => row.code === current) ? current : (nextItems.length > 0 ? nextItems[0].code : null);
    });
    setPending(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const totals = report?.totals ?? null;

  const rows = useMemo(() => report?.items ?? [], [report]);

  const focused = useMemo(() => {
    if (!focusedCode) return null;
    return rows.find((row) => row.code === focusedCode) ?? null;
  }, [focusedCode, rows]);

  return (
    <PageShell title="Referrals" subtitle="Attribution and commission reporting." breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Referrals" }]}>
      <Card className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="type-title">Work queue</h2>
            <p className="mt-1 type-meta text-text-muted">Step 1: pick a member/code. Step 2: review commission owed.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button intent="secondary" onClick={() => void load()} disabled={pending}>
              Refresh
            </Button>
            <a href="/api/v1/admin/referrals/export" className="type-label underline" target="_blank" rel="noreferrer">
              Export CSV
            </a>
          </div>
        </div>

        {totals ? (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Badge variant="outline">Members: {totals.members}</Badge>
            <Badge variant="outline">Clicks: {totals.clicks}</Badge>
            <Badge variant="outline">Conversions: {totals.conversions}</Badge>
            <Badge variant="secondary">Commission owed: {formatCents(totals.commission_owed_cents)}</Badge>
            {report?.generated_at ? (
              <span className="ml-auto type-meta text-text-muted">
                Updated: <RelativeTime iso={report.generated_at} />
              </span>
            ) : null}
          </div>
        ) : null}
      </Card>

      {problem ? (
        <div className="mt-4">
          <ProblemDetailsPanel problem={problem} />
        </div>
      ) : null}

      {pending ? <p className="mt-4 type-meta text-text-muted">Loading…</p> : null}

      <div className="mt-4 grid gap-4 lg:grid-cols-[22rem,1fr]">
        <Card className="p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="type-title">Queue</h2>
              <p className="mt-1 type-meta text-text-muted">Codes ({rows.length})</p>
            </div>
            <Badge variant="outline">{rows.length}</Badge>
          </div>

          {rows.length === 0 ? (
            <p className="mt-3 type-meta text-text-muted">No referral codes yet.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {rows.map((row) => (
                <li
                  key={`${row.user_email}-${row.code}`}
                  className={
                    focusedCode === row.code
                      ? "rounded-sm border border-border-default bg-action-secondary/30 p-3"
                      : "rounded-sm border border-border-default p-3"
                  }
                >
                  <button
                    type="button"
                    className="w-full text-left"
                    aria-current={focusedCode === row.code ? "true" : undefined}
                    onClick={() => setFocusedCode(row.code)}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="type-label text-text-primary">{row.user_email}</p>
                      <Badge variant="outline">{row.code}</Badge>
                    </div>
                    <p className="mt-1 type-meta text-text-muted">
                      {row.clicks} clicks · {row.conversions} conversions · {formatPercent(row.conversion_rate)}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-4">
          <h2 className="type-title">Detail</h2>

          {focused ? (
            <div className="mt-3 space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="type-label text-text-primary">{focused.user_email}</p>
                  <p className="mt-1 type-meta text-text-muted">Code: {focused.code}</p>
                </div>
                <Badge variant="secondary">Owed: {formatCents(focused.commission_owed_cents)}</Badge>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="surface rounded-sm border border-border-default p-3">
                  <p className="type-meta text-text-muted">Performance</p>
                  <p className="mt-1 type-label text-text-primary">{formatPercent(focused.conversion_rate)} conversion</p>
                  <p className="mt-2 type-meta text-text-muted">Clicks: {focused.clicks}</p>
                  <p className="type-meta text-text-muted">Conversions: {focused.conversions}</p>
                </div>
                <div className="surface rounded-sm border border-border-default p-3">
                  <p className="type-meta text-text-muted">Money</p>
                  <p className="mt-1 type-label text-text-primary">{formatCents(focused.gross_accepted_cents)}</p>
                  <p className="mt-1 type-meta text-text-muted">Gross accepted</p>
                  <p className="mt-2 type-meta text-text-muted">Commission owed: {formatCents(focused.commission_owed_cents)}</p>
                </div>
              </div>

              <details className="surface rounded-sm border border-border-default p-3" open>
                <summary className="cursor-pointer type-label text-text-primary">Policy</summary>
                <p className="mt-2 type-body-sm text-text-secondary">
                  Commission owed is calculated as 25% of accepted proposal amounts linked to attributed intake requests.
                </p>
              </details>
            </div>
          ) : (
            <p className="mt-3 type-body-sm text-text-secondary">Step 2: choose a code from the queue.</p>
          )}
        </Card>
      </div>
    </PageShell>
  );
}
