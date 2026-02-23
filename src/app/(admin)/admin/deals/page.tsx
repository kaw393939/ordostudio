"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { PageShell } from "@/components/layout/page-shell";
import { Button, Card } from "@/components/primitives";
import { ProblemDetailsPanel } from "@/components/problem-details";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RelativeTime } from "@/components/forms";
import { requestHal, type ProblemDetails } from "@/lib/hal-client";

type DealStatus =
  | "QUEUED"
  | "ASSIGNED"
  | "MAESTRO_APPROVED"
  | "PAID"
  | "IN_PROGRESS"
  | "DELIVERED"
  | "CLOSED"
  | "REFUNDED";

type DealRow = {
  id: string;
  intake_id: string;
  offer_slug: string | null;
  status: DealStatus;
  referrer_user_id: string | null;
  requested_provider_user_id: string | null;
  provider_user_id: string | null;
  maestro_user_id: string | null;
  created_at: string;
  updated_at: string;
};

type DealListResponse = {
  count: number;
  items: DealRow[];
};

type DealHistoryRow = {
  id: string;
  deal_id: string;
  from_status: DealStatus | null;
  to_status: DealStatus;
  note: string | null;
  changed_by: string | null;
  changed_at: string;
};

type DealDetail = DealRow & {
  history: DealHistoryRow[];
};

type BadgeVariant = "default" | "secondary" | "destructive" | "outline" | "ghost" | "link";

const statusVariant = (status: DealStatus): BadgeVariant => {
  if (status === "REFUNDED") return "destructive";
  if (status === "QUEUED") return "outline";
  if (status === "ASSIGNED") return "secondary";
  if (status === "IN_PROGRESS") return "secondary";
  if (status === "CLOSED") return "outline";
  return "default";
};

const nextStepHint = (status: DealStatus): string => {
  if (status === "QUEUED") return "Create/confirm the offer, then assign a provider.";
  if (status === "ASSIGNED") return "Approve the deal as maestro/admin.";
  if (status === "MAESTRO_APPROVED") return "Collect payment (status will move to PAID via Stripe).";
  if (status === "PAID") return "Provider can start work (move to IN_PROGRESS when underway).";
  if (status === "IN_PROGRESS") return "Track delivery and mark DELIVERED when complete.";
  if (status === "DELIVERED") return "Ledger entries can be approved for payout.";
  if (status === "REFUNDED") return "Refund complete; ledger should be voided automatically.";
  return "Archive/close when complete.";
};

export default function AdminDealsPage() {
  const [status, setStatus] = useState<"all" | DealStatus>("all");
  const [intakeId, setIntakeId] = useState("");
  const [pending, setPending] = useState(true);
  const [problem, setProblem] = useState<ProblemDetails | null>(null);
  const [items, setItems] = useState<DealRow[]>([]);

  const [selected, setSelected] = useState<DealDetail | null>(null);
  const [detailPending, setDetailPending] = useState(false);

  const load = useCallback(async () => {
    setPending(true);
    setProblem(null);

    const params = new URLSearchParams();
    if (status !== "all") params.set("status", status);
    if (intakeId.trim().length > 0) params.set("intake_id", intakeId.trim());

    const href = params.toString().length > 0 ? `/api/v1/admin/deals?${params.toString()}` : "/api/v1/admin/deals";
    const response = await requestHal<DealListResponse>(href);
    if (!response.ok) {
      setProblem(response.problem);
      setPending(false);
      return;
    }

    setItems(response.data.items ?? []);
    setPending(false);
  }, [status, intakeId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const loadDetail = async (id: string) => {
    setDetailPending(true);
    setProblem(null);

    const response = await requestHal<DealDetail>(`/api/v1/admin/deals/${id}`);
    if (!response.ok) {
      setProblem(response.problem);
      setDetailPending(false);
      return;
    }

    setSelected(response.data);
    setDetailPending(false);
  };

  const rows = useMemo(() => items ?? [], [items]);

  return (
    <PageShell title="Deals" subtitle="Queue, assignment, approval, and delivery status." breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Deals" }]}>
      <Card className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="type-title">Work queues</h2>
            <p className="mt-1 type-meta text-text-muted">Pick the next chunk of work. The sidebar has everything else.</p>
          </div>
          <Button intent="secondary" onClick={() => void load()} disabled={pending}>
            {pending ? "Loading..." : "Refresh"}
          </Button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button intent={status === "QUEUED" ? "primary" : "secondary"} onClick={() => setStatus("QUEUED")} disabled={pending}>
            Needs assignment
          </Button>
          <Button intent={status === "ASSIGNED" ? "primary" : "secondary"} onClick={() => setStatus("ASSIGNED")} disabled={pending}>
            Needs approval
          </Button>
          <Button intent={status === "MAESTRO_APPROVED" ? "primary" : "secondary"} onClick={() => setStatus("MAESTRO_APPROVED")} disabled={pending}>
            Needs payment
          </Button>
          <Button intent={status === "IN_PROGRESS" ? "primary" : "secondary"} onClick={() => setStatus("IN_PROGRESS")} disabled={pending}>
            In progress
          </Button>
          <Button intent={status === "DELIVERED" ? "primary" : "secondary"} onClick={() => setStatus("DELIVERED")} disabled={pending}>
            Delivered
          </Button>
          <Button intent={status === "all" ? "primary" : "secondary"} onClick={() => setStatus("all")} disabled={pending}>
            All
          </Button>
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="deal-status">Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as "all" | DealStatus)}>
              <SelectTrigger id="deal-status" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="QUEUED">QUEUED</SelectItem>
                <SelectItem value="ASSIGNED">ASSIGNED</SelectItem>
                <SelectItem value="MAESTRO_APPROVED">MAESTRO_APPROVED</SelectItem>
                <SelectItem value="PAID">PAID</SelectItem>
                <SelectItem value="IN_PROGRESS">IN_PROGRESS</SelectItem>
                <SelectItem value="DELIVERED">DELIVERED</SelectItem>
                <SelectItem value="CLOSED">CLOSED</SelectItem>
                <SelectItem value="REFUNDED">REFUNDED</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="deal-intake">Intake ID</Label>
            <Input id="deal-intake" value={intakeId} onChange={(e) => setIntakeId(e.target.value)} placeholder="intake id" />
          </div>
          <div className="hidden md:block" />
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
              <p className="mt-1 type-meta text-text-muted">Step 1: pick a deal to work.</p>
            </div>
            <Badge variant="outline">{rows.length}</Badge>
          </div>

          {rows.length === 0 ? (
            <p className="mt-3 type-meta text-text-muted">No deals match the current filters.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {rows.map((row) => (
                <li
                  key={row.id}
                  className={
                    selected?.id === row.id
                      ? "rounded-sm border border-border-default bg-action-secondary/30 p-3"
                      : "rounded-sm border border-border-default p-3"
                  }
                >
                  <button
                    type="button"
                    className="w-full text-left"
                    aria-current={selected?.id === row.id ? "true" : undefined}
                    onClick={() => void loadDetail(row.id)}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="type-label text-text-primary">{row.id}</p>
                      <Badge variant={statusVariant(row.status)}>{row.status}</Badge>
                    </div>
                    <p className="mt-1 type-meta text-text-muted">Offer: {row.offer_slug ?? "-"}</p>
                    <p className="type-meta text-text-muted">Intake: {row.intake_id}</p>
                    <p className="mt-1 type-meta text-text-muted">Updated: <RelativeTime iso={row.updated_at} /></p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-4">
          <h2 className="type-title">Deal</h2>
          {detailPending ? <p className="mt-3 type-meta text-text-muted">Loading…</p> : null}

          {selected ? (
            <div className="mt-3 space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="type-label text-text-primary">{selected.id}</p>
                  <p className="mt-1 type-meta text-text-muted">{nextStepHint(selected.status)}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={statusVariant(selected.status)}>{selected.status}</Badge>
                  <Badge variant="outline">{selected.offer_slug ?? "No offer"}</Badge>
                  <Link href={`/admin/deals/${selected.id}`} className="type-label underline">
                    Open
                  </Link>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="surface rounded-sm border border-border-default p-3">
                  <p className="type-meta text-text-muted">Provider</p>
                  <p className="type-label text-text-primary">{selected.provider_user_id ?? "—"}</p>
                  <p className="mt-2 type-meta text-text-muted">Maestro</p>
                  <p className="type-label text-text-primary">{selected.maestro_user_id ?? "—"}</p>
                </div>
                <div className="surface rounded-sm border border-border-default p-3">
                  <p className="type-meta text-text-muted">Referrer</p>
                  <p className="type-label text-text-primary">{selected.referrer_user_id ?? "—"}</p>
                  <p className="mt-2 type-meta text-text-muted">Requested provider</p>
                  <p className="type-label text-text-primary">{selected.requested_provider_user_id ?? "—"}</p>
                </div>
              </div>

              <details className="surface rounded-sm border border-border-default p-3">
                <summary className="cursor-pointer type-label text-text-primary">Timestamps</summary>
                <p className="mt-2 type-meta text-text-muted">Created: {selected.created_at}</p>
                <p className="type-meta text-text-muted">Updated: {selected.updated_at}</p>
              </details>

              <details className="surface rounded-sm border border-border-default p-3">
                <summary className="cursor-pointer type-label text-text-primary">History ({selected.history.length})</summary>
                <ul className="mt-3 space-y-1">
                  {[...selected.history].reverse().map((entry) => (
                    <li key={entry.id} className="type-meta text-text-muted">
                      <RelativeTime iso={entry.changed_at} /> · {entry.from_status ?? "-"} → {entry.to_status}
                      {entry.note ? ` · ${entry.note}` : ""}
                    </li>
                  ))}
                </ul>
              </details>
            </div>
          ) : (
            <p className="mt-3 type-body-sm text-text-secondary">Step 2: select a deal from the queue.</p>
          )}
        </Card>
      </div>
    </PageShell>
  );
}
