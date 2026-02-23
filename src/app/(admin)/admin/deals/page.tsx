"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { PageShell } from "@/components/layout/page-shell";
import { Button, Card } from "@/components/primitives";
import { ProblemDetailsPanel } from "@/components/problem-details";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

export default function AdminDealsPage() {
  const [status, setStatus] = useState<"all" | DealStatus>("all");
  const [intakeId, setIntakeId] = useState("");
  const [pending, setPending] = useState(true);
  const [problem, setProblem] = useState<ProblemDetails | null>(null);
  const [items, setItems] = useState<DealRow[]>([]);

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

  const rows = useMemo(() => items ?? [], [items]);

  return (
    <PageShell title="Deals" subtitle="Queue, assignment, approval, and delivery status." breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Deals" }]}>
      <Card className="p-4">
        <h2 className="type-title">Filters</h2>
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
          <div className="flex items-end">
            <Button intent="secondary" onClick={() => void load()} disabled={pending}>
              Refresh
            </Button>
          </div>
        </div>
      </Card>

      {problem ? (
        <div className="mt-4">
          <ProblemDetailsPanel problem={problem} />
        </div>
      ) : null}

      {pending ? <p className="mt-4 type-meta text-text-muted">Loading…</p> : null}

      <Card className="mt-4 p-4">
        <h2 className="type-title">Deals ({rows.length})</h2>

        {rows.length === 0 ? (
          <p className="mt-3 type-meta text-text-muted">No deals match the current filters.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-sm" aria-label="Deals table">
              <thead>
                <tr>
                  <th scope="col" className="pb-2">Deal</th>
                  <th scope="col" className="pb-2">Status</th>
                  <th scope="col" className="pb-2">Offer</th>
                  <th scope="col" className="pb-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-border-default">
                    <td className="py-2 pr-3">
                      <p className="type-meta text-text-secondary">{row.id}</p>
                      <p className="type-meta text-text-muted">Intake: {row.intake_id}</p>
                    </td>
                    <td className="py-2 pr-3">
                      <p className="type-meta text-text-secondary">{row.status}</p>
                    </td>
                    <td className="py-2 pr-3">
                      <p className="type-meta text-text-secondary">{row.offer_slug ?? "-"}</p>
                    </td>
                    <td className="py-2">
                      <Link href={`/admin/deals/${row.id}`} className="type-label underline">
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </PageShell>
  );
}
