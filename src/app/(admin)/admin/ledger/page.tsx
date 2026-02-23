"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { PageShell } from "@/components/layout/page-shell";
import { Button, Card } from "@/components/primitives";
import { ProblemDetailsPanel } from "@/components/problem-details";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RelativeTime } from "@/components/forms";
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

type BadgeVariant = "default" | "secondary" | "destructive" | "outline" | "ghost" | "link";

const statusVariant = (value: LedgerStatus): BadgeVariant => {
  if (value === "EARNED") return "outline";
  if (value === "APPROVED") return "secondary";
  if (value === "VOID") return "destructive";
  return "default";
};

const typeLabel = (entryType: LedgerEntry["entry_type"]): string => {
  if (entryType === "PROVIDER_PAYOUT") return "Provider payout";
  if (entryType === "REFERRER_COMMISSION") return "Referrer commission";
  return "Platform revenue";
};

export default function AdminLedgerPage() {
  const [pending, setPending] = useState(true);
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState<ProblemDetails | null>(null);
  const [entries, setEntries] = useState<LedgerEntry[]>([]);

  const [status, setStatus] = useState<LedgerStatus | "all">("EARNED");
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [focusedId, setFocusedId] = useState<string | null>(null);
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
    setFocusedId(null);
    setConfirmApprove(false);
    setConfirmPayout(false);
    setPending(false);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  useEffect(() => {
    if (!focusedId) {
      return;
    }

    if (!entries.some((entry) => entry.id === focusedId)) {
      setFocusedId(null);
    }
  }, [entries, focusedId]);

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

  const focusedEntry = useMemo(() => {
    if (!focusedId) return null;
    return entries.find((entry) => entry.id === focusedId) ?? null;
  }, [entries, focusedId]);

  const selectAll = (which: LedgerStatus) => {
    setSelected(() => {
      const next: Record<string, boolean> = {};
      for (const entry of entries) {
        if (entry.status === which) {
          next[entry.id] = true;
        }
      }
      return next;
    });
  };

  const clearSelection = () => {
    setSelected({});
    setConfirmApprove(false);
    setConfirmPayout(false);
  };

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
      <Card className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="type-title">Work queue</h2>
            <p className="mt-1 type-meta text-text-muted">Approve earned entries, then pay approved entries via Stripe.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button intent="secondary" onClick={() => void load()} disabled={pending || saving}>
              Refresh
            </Button>
            <a href={exportHref} className="type-label underline" target="_blank" rel="noreferrer">
              Export CSV
            </a>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button intent={status === "EARNED" ? "primary" : "secondary"} onClick={() => setStatus("EARNED")} disabled={pending || saving}>
            Needs approval
          </Button>
          <Button intent={status === "APPROVED" ? "primary" : "secondary"} onClick={() => setStatus("APPROVED")} disabled={pending || saving}>
            Ready to pay
          </Button>
          <Button intent={status === "PAID" ? "primary" : "secondary"} onClick={() => setStatus("PAID")} disabled={pending || saving}>
            Paid
          </Button>
          <Button intent={status === "VOID" ? "primary" : "secondary"} onClick={() => setStatus("VOID")} disabled={pending || saving}>
            Void
          </Button>
          <Button intent={status === "all" ? "primary" : "secondary"} onClick={() => setStatus("all")} disabled={pending || saving}>
            All
          </Button>

          <div className="ml-auto w-64">
            <Select value={status} onValueChange={(v) => setStatus(v as LedgerStatus | "all")}>
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
              <p className="mt-1 type-meta text-text-muted">Step 1: select entries to approve/pay.</p>
            </div>
            <Badge variant="outline">{entries.length}</Badge>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button
              intent="secondary"
              size="sm"
              onClick={() => selectAll("EARNED")}
              disabled={saving || entries.every((entry) => entry.status !== "EARNED")}
            >
              Select all earned
            </Button>
            <Button
              intent="secondary"
              size="sm"
              onClick={() => selectAll("APPROVED")}
              disabled={saving || entries.every((entry) => entry.status !== "APPROVED")}
            >
              Select all approved
            </Button>
            <Button intent="secondary" size="sm" onClick={clearSelection} disabled={saving}>
              Clear
            </Button>
          </div>

          {entries.length === 0 ? (
            <p className="mt-3 type-meta text-text-muted">No entries found.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {entries.map((row) => {
                const canSelect = row.status === "EARNED" || row.status === "APPROVED";
                const isFocused = focusedId === row.id;

                return (
                  <li
                    key={row.id}
                    className={
                      isFocused
                        ? "rounded-sm border border-border-default bg-action-secondary/30 p-3"
                        : "rounded-sm border border-border-default p-3"
                    }
                  >
                    <div className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        className="mt-1 h-4 w-4"
                        disabled={!canSelect || saving}
                        checked={!!selected[row.id]}
                        onChange={(e) => setSelected((prev) => ({ ...prev, [row.id]: e.target.checked }))}
                        aria-label={`Select ledger entry ${row.id}`}
                      />
                      <button
                        type="button"
                        className="min-w-0 flex-1 text-left"
                        onClick={() => setFocusedId(row.id)}
                        aria-current={isFocused ? "true" : undefined}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <p className="type-label text-text-primary">{typeLabel(row.entry_type)}</p>
                          <Badge variant={statusVariant(row.status)}>{row.status}</Badge>
                        </div>
                        <p className="mt-1 type-meta text-text-muted">
                          {formatCents(row.amount_cents, row.currency)} · Deal {row.deal_id}
                        </p>
                        <p className="mt-1 type-meta text-text-muted">
                          Earned: <RelativeTime iso={row.earned_at} />
                          {row.beneficiary_user_id ? ` · ${row.beneficiary_user_id}` : ""}
                        </p>
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card className="p-4">
          <h2 className="type-title">Entry</h2>

          {focusedEntry ? (
            <div className="mt-3 space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="type-label text-text-primary">{focusedEntry.id}</p>
                  <p className="mt-1 type-meta text-text-muted">{typeLabel(focusedEntry.entry_type)}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={statusVariant(focusedEntry.status)}>{focusedEntry.status}</Badge>
                  <Link href={`/admin/deals/${focusedEntry.deal_id}`} className="type-label underline">
                    Open deal
                  </Link>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="surface rounded-sm border border-border-default p-3">
                  <p className="type-meta text-text-muted">Amount</p>
                  <p className="type-label text-text-primary">{formatCents(focusedEntry.amount_cents, focusedEntry.currency)}</p>
                  <p className="mt-2 type-meta text-text-muted">Beneficiary</p>
                  <p className="type-label text-text-primary">{focusedEntry.beneficiary_user_id ?? "—"}</p>
                </div>
                <div className="surface rounded-sm border border-border-default p-3">
                  <p className="type-meta text-text-muted">Earned</p>
                  <p className="type-label text-text-primary"><RelativeTime iso={focusedEntry.earned_at} /></p>
                  <p className="mt-2 type-meta text-text-muted">Approved</p>
                  <p className="type-label text-text-primary">{focusedEntry.approved_at ? <RelativeTime iso={focusedEntry.approved_at} /> : "—"}</p>
                </div>
              </div>

              <details className="surface rounded-sm border border-border-default p-3" open>
                <summary className="cursor-pointer type-label text-text-primary">Batch actions</summary>

                <div className="mt-3 grid gap-4">
                  <div className="rounded-sm border border-border-default bg-surface p-3">
                    <p className="type-label text-text-primary">Approve</p>
                    <p className="mt-1 type-meta text-text-muted">Updates selected EARNED entries to APPROVED.</p>

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
                      <Button intent="primary" onClick={() => void onApprove()} disabled={saving || selectedEarnedIds.length === 0 || !confirmApprove}>
                        {saving ? "Approving…" : `Approve (${selectedEarnedIds.length})`}
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-sm border border-border-default bg-surface p-3">
                    <p className="type-label text-text-primary">Payout</p>
                    <p className="mt-1 type-meta text-text-muted">Executes Stripe transfers for selected APPROVED entries and marks them PAID.</p>

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
                      <Button intent="primary" onClick={() => void onPayout()} disabled={saving || selectedApprovedIds.length === 0 || !confirmPayout}>
                        {saving ? "Paying…" : `Pay (${selectedApprovedIds.length})`}
                      </Button>
                    </div>
                  </div>
                </div>
              </details>
            </div>
          ) : (
            <p className="mt-3 type-body-sm text-text-secondary">Step 2: focus an entry from the queue to review and take action.</p>
          )}
        </Card>
      </div>
    </PageShell>
  );
}
