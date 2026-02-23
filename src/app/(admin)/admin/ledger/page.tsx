"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { PageShell } from "@/components/layout/page-shell";
import { Button, Card } from "@/components/primitives";
import { ProblemDetailsPanel } from "@/components/problem-details";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCents } from "@/lib/currency";
import { requestHal, type ProblemDetails } from "@/lib/hal-client";

type LedgerStatus = "EARNED" | "APPROVED" | "PAID" | "VOID";

type LedgerEntry = {
  id: string;
  deal_id: string;
  entry_type: "PROVIDER_PAYOUT" | "REFERRER_COMMISSION" | "PLATFORM_REVENUE";
  beneficiary_user_id: string | null;
  amount_cents: number;
  currency: string;
  status: LedgerStatus;
  earned_at: string;
  approved_at: string | null;
};

type LedgerResponse = {
  count: number;
  items: LedgerEntry[];
  _links?: {
    export?: { href: string };
  };
};

export default function AdminLedgerPage() {
  const [pending, setPending] = useState(true);
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState<ProblemDetails | null>(null);
  const [entries, setEntries] = useState<LedgerEntry[]>([]);

  const [status, setStatus] = useState<LedgerStatus | "all">("EARNED");
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [confirmApprove, setConfirmApprove] = useState(false);
  const [confirmPayout, setConfirmPayout] = useState(false);

  const load = async () => {
    setPending(true);
    const href = status === "all" ? "/api/v1/admin/ledger" : `/api/v1/admin/ledger?status=${status}`;
    const response = await requestHal<LedgerResponse>(href);
    if (!response.ok) {
      setProblem(response.problem);
      setEntries([]);
      setPending(false);
      return;
    }

    setProblem(null);
    setEntries(response.data.items ?? []);
    setSelected({});
    setConfirmApprove(false);
    setPending(false);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const exportHref = useMemo(() => {
    return status === "all" ? "/api/v1/admin/ledger/export" : `/api/v1/admin/ledger/export?status=${status}`;
  }, [status]);

  const selectedEarnedIds = useMemo(
    () => entries.filter((row) => row.status === "EARNED" && selected[row.id]).map((row) => row.id),
    [entries, selected],
  );
  const selectedApprovedIds = useMemo(
    () => entries.filter((row) => row.status === "APPROVED" && selected[row.id]).map((row) => row.id),
    [entries, selected],
  );

  const onApprove = async () => {
    setSaving(true);
    setProblem(null);

    const response = await requestHal<{ updated: number }>("/api/v1/admin/ledger", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ entry_ids: selectedEarnedIds, confirm: confirmApprove }),
    });

    if (!response.ok) {
      setProblem(response.problem);
      setSaving(false);
      return;
    }

    await load();
    setSaving(false);
  };

  const onPayout = async () => {
    setSaving(true);
    setProblem(null);

    const response = await requestHal<{ attempted: number; paid: number; failed: number; skipped: number }>(
      "/api/v1/admin/ledger/payouts",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ entry_ids: selectedApprovedIds, confirm: confirmPayout }),
      },
    );

    if (!response.ok) {
      setProblem(response.problem);
      setSaving(false);
      return;
    }

    await load();
    setSaving(false);
  };

  return (
    <PageShell title="Ledger" subtitle="Approve provider payouts and referrer commissions." breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Ledger" }]}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button intent="secondary" onClick={() => void load()} disabled={pending || saving}>
            Refresh
          </Button>
          <a href={exportHref} className="type-label underline" target="_blank" rel="noreferrer">
            Export CSV
          </a>
        </div>

        <div className="w-64">
          <Select value={status} onValueChange={(v) => setStatus(v as LedgerStatus | "all")}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="EARNED">EARNED</SelectItem>
              <SelectItem value="APPROVED">APPROVED</SelectItem>
              <SelectItem value="PAID">PAID</SelectItem>
              <SelectItem value="VOID">VOID</SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {problem ? (
        <div className="mt-4">
          <ProblemDetailsPanel problem={problem} />
        </div>
      ) : null}

      {pending ? <p className="mt-4 type-meta text-text-muted">Loading…</p> : null}

      <Card className="mt-4 p-4">
        <h2 className="type-title">Entries ({entries.length})</h2>
        {entries.length === 0 ? (
          <p className="mt-2 type-meta text-text-muted">No entries found.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="text-left type-meta text-text-muted">
                  <th className="pb-2">Select</th>
                  <th className="pb-2">Deal</th>
                  <th className="pb-2">Type</th>
                  <th className="pb-2">Beneficiary</th>
                  <th className="pb-2">Amount</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2">Earned</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((row) => {
                  const canSelect = row.status === "EARNED" || row.status === "APPROVED";
                  return (
                    <tr key={row.id} className="border-t border-border-default type-meta">
                      <td className="py-2">
                        <input
                          type="checkbox"
                          className="h-4 w-4"
                          disabled={!canSelect || saving}
                          checked={!!selected[row.id]}
                          onChange={(e) => setSelected((prev) => ({ ...prev, [row.id]: e.target.checked }))}
                        />
                      </td>
                      <td className="py-2">
                        <Link href={`/admin/deals/${row.deal_id}`} className="underline">
                          {row.deal_id}
                        </Link>
                      </td>
                      <td className="py-2">{row.entry_type}</td>
                      <td className="py-2 text-text-muted">{row.beneficiary_user_id ?? "-"}</td>
                      <td className="py-2">
                        {formatCents(row.amount_cents, row.currency)}
                      </td>
                      <td className="py-2">{row.status}</td>
                      <td className="py-2 text-text-muted">{row.earned_at}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="mt-4 p-4">
        <h2 className="type-title">Approve</h2>
        <p className="mt-1 type-meta text-text-muted">Approval updates selected EARNED entries to APPROVED.</p>

        <div className="mt-3 flex items-center gap-2">
          <input
            id="confirm-approve"
            type="checkbox"
            className="h-4 w-4"
            checked={confirmApprove}
            onChange={(e) => setConfirmApprove(e.target.checked)}
            disabled={saving}
          />
          <label htmlFor="confirm-approve" className="type-meta text-text-muted">
            Confirm approval
          </label>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <Button intent="primary" onClick={() => void onApprove()} disabled={saving || selectedEarnedIds.length === 0}>
            {saving ? "Approving…" : `Approve (${selectedEarnedIds.length})`}
          </Button>
        </div>
      </Card>

      <Card className="mt-4 p-4">
        <h2 className="type-title">Payout</h2>
        <p className="mt-1 type-meta text-text-muted">Payout executes Stripe transfers for selected APPROVED entries and marks them PAID.</p>

        <div className="mt-3 flex items-center gap-2">
          <input
            id="confirm-payout"
            type="checkbox"
            className="h-4 w-4"
            checked={confirmPayout}
            onChange={(e) => setConfirmPayout(e.target.checked)}
            disabled={saving}
          />
          <label htmlFor="confirm-payout" className="type-meta text-text-muted">
            Confirm payout
          </label>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <Button intent="primary" onClick={() => void onPayout()} disabled={saving || selectedApprovedIds.length === 0}>
            {saving ? "Paying…" : `Pay (${selectedApprovedIds.length})`}
          </Button>
        </div>
      </Card>
    </PageShell>
  );
}
