"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { PageShell } from "@/components/layout/page-shell";
import { Button, Card } from "@/components/primitives";
import { ProblemDetailsPanel } from "@/components/problem-details";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
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

type DealHistory = {
  id: string;
  from_status: DealStatus | null;
  to_status: DealStatus;
  note: string | null;
  changed_by: string | null;
  changed_at: string;
};

type DealDetail = {
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
  history: DealHistory[];
};

export default function AdminDealDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [pending, setPending] = useState(true);
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState<ProblemDetails | null>(null);
  const [deal, setDeal] = useState<DealDetail | null>(null);

  const [providerId, setProviderId] = useState("");
  const [maestroId, setMaestroId] = useState("");
  const [note, setNote] = useState("");
  const [statusDraft, setStatusDraft] = useState<DealStatus>("QUEUED");

  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [refundReason, setRefundReason] = useState("");
  const [refundConfirm, setRefundConfirm] = useState(false);

  const load = useCallback(async () => {
    setPending(true);
    const response = await requestHal<DealDetail>(`/api/v1/admin/deals/${id}`);
    if (!response.ok) {
      setProblem(response.problem);
      setDeal(null);
      setPending(false);
      return;
    }

    setProblem(null);
    setDeal(response.data);
    setProviderId(response.data.provider_user_id ?? "");
    setMaestroId(response.data.maestro_user_id ?? "");
    setStatusDraft(response.data.status);
    setPending(false);
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const onAssign = async () => {
    if (!deal) return;
    setSaving(true);
    setProblem(null);

    const response = await requestHal<DealDetail>(`/api/v1/admin/deals/${deal.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "assign",
        provider_user_id: providerId,
        maestro_user_id: maestroId,
        note: note.trim().length > 0 ? note : null,
      }),
    });

    if (!response.ok) {
      setProblem(response.problem);
      setSaving(false);
      return;
    }

    setDeal(response.data);
    setStatusDraft(response.data.status);
    setNote("");
    setSaving(false);
  };

  const onApprove = async () => {
    if (!deal) return;
    setSaving(true);
    setProblem(null);

    const response = await requestHal<DealDetail>(`/api/v1/admin/deals/${deal.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "approve", note: note.trim().length > 0 ? note : null }),
    });

    if (!response.ok) {
      setProblem(response.problem);
      setSaving(false);
      return;
    }

    setDeal(response.data);
    setStatusDraft(response.data.status);
    setNote("");
    setSaving(false);
  };

  const onUpdateStatus = async () => {
    if (!deal) return;
    setSaving(true);
    setProblem(null);

    const response = await requestHal<DealDetail>(`/api/v1/admin/deals/${deal.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "status", status: statusDraft, note: note.trim().length > 0 ? note : null }),
    });

    if (!response.ok) {
      setProblem(response.problem);
      setSaving(false);
      return;
    }

    setDeal(response.data);
    setStatusDraft(response.data.status);
    setNote("");
    setSaving(false);
  };

  const onCreateCheckout = async () => {
    if (!deal) return;
    setSaving(true);
    setProblem(null);

    const response = await requestHal<{ checkout_url: string }>(`/api/v1/admin/deals/${deal.id}/checkout`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      setProblem(response.problem);
      setSaving(false);
      return;
    }

    setCheckoutUrl(response.data.checkout_url ?? null);
    setSaving(false);
  };

  const onRefund = async () => {
    if (!deal) return;
    setSaving(true);
    setProblem(null);

    const response = await requestHal<unknown>(`/api/v1/admin/deals/${deal.id}/refund`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ reason: refundReason, confirm: refundConfirm }),
    });

    if (!response.ok) {
      setProblem(response.problem);
      setSaving(false);
      return;
    }

    setRefundReason("");
    setRefundConfirm(false);
    await load();
    setSaving(false);
  };

  const history = useMemo(() => deal?.history ?? [], [deal]);

  return (
    <PageShell title="Deal" subtitle="Assignment, approval, and guardrailed delivery." breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Deals", href: "/admin/deals" }, { label: id }]}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/admin/deals" className="type-label underline">
            Back to deals
          </Link>
          {deal ? (
            <Link href={`/admin/intake`} className="type-label underline">
              Intake queue
            </Link>
          ) : null}
        </div>
        <Button intent="secondary" onClick={() => void load()} disabled={pending}>
          Refresh
        </Button>
      </div>

      {problem ? (
        <div className="mt-4">
          <ProblemDetailsPanel problem={problem} />
        </div>
      ) : null}

      {pending ? <p className="mt-4 type-meta text-text-muted">Loading…</p> : null}

      {deal ? (
        <>
          <Card className="mt-4 p-4">
            <p className="type-meta text-text-muted">Deal ID</p>
            <p className="mt-1 type-meta text-text-secondary">{deal.id}</p>
            <p className="mt-3 type-meta text-text-muted">Status</p>
            <p className="mt-1 type-label text-text-primary">{deal.status}</p>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="deal-provider">Provider user id</Label>
                <Input id="deal-provider" value={providerId} onChange={(e) => setProviderId(e.target.value)} placeholder="usr_..." />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="deal-maestro">Maestro user id</Label>
                <Input id="deal-maestro" value={maestroId} onChange={(e) => setMaestroId(e.target.value)} placeholder="usr_..." />
              </div>
            </div>

            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="deal-status">Update status</Label>
                <Select value={statusDraft} onValueChange={(v) => setStatusDraft(v as DealStatus)}>
                  <SelectTrigger id="deal-status" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="QUEUED">QUEUED</SelectItem>
                    <SelectItem value="ASSIGNED">ASSIGNED</SelectItem>
                    <SelectItem value="MAESTRO_APPROVED">MAESTRO_APPROVED</SelectItem>
                    <SelectItem value="IN_PROGRESS">IN_PROGRESS</SelectItem>
                    <SelectItem value="DELIVERED">DELIVERED</SelectItem>
                    <SelectItem value="CLOSED">CLOSED</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="deal-note">Note</Label>
                <Textarea id="deal-note" value={note} onChange={(e) => setNote(e.target.value)} className="min-h-20" />
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button intent="secondary" onClick={() => void onAssign()} disabled={saving}>
                Assign
              </Button>
              <Button intent="secondary" onClick={() => void onApprove()} disabled={saving}>
                Maestro approve
              </Button>
              <Button intent="primary" onClick={() => void onUpdateStatus()} disabled={saving}>
                {saving ? "Saving…" : "Update status"}
              </Button>
            </div>

            <p className="mt-3 type-meta text-text-muted">
              Guardrail: IN_PROGRESS requires MAESTRO_APPROVED + PAID.
            </p>
          </Card>

          <Card className="mt-4 p-4">
            <h2 className="type-title">Payment</h2>
            <p className="mt-1 type-meta text-text-muted">
              Payment state (PAID/REFUNDED) is managed by Stripe webhook and refund console.
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button intent="secondary" onClick={() => void onCreateCheckout()} disabled={saving}>
                Create checkout session
              </Button>
              {checkoutUrl ? (
                <a href={checkoutUrl} className="type-label underline" target="_blank" rel="noreferrer">
                  Open checkout
                </a>
              ) : null}
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="refund-reason">Refund reason</Label>
                <Input id="refund-reason" value={refundReason} onChange={(e) => setRefundReason(e.target.value)} placeholder="Reason" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="refund-confirm">Confirm refund</Label>
                <div className="flex items-center gap-2">
                  <input
                    id="refund-confirm"
                    type="checkbox"
                    className="h-4 w-4"
                    checked={refundConfirm}
                    onChange={(e) => setRefundConfirm(e.target.checked)}
                    disabled={saving}
                  />
                  <span className="type-meta text-text-muted">I understand this will trigger a Stripe refund.</span>
                </div>
              </div>
            </div>

            <div className="mt-3">
              <Button intent="danger" onClick={() => void onRefund()} disabled={saving || refundReason.trim().length === 0 || !refundConfirm}>
                Issue refund
              </Button>
            </div>
          </Card>

          <Card className="mt-4 p-4">
            <h2 className="type-title">History</h2>
            {history.length === 0 ? (
              <p className="mt-2 type-meta text-text-muted">No history yet.</p>
            ) : (
              <ul className="mt-3 space-y-1">
                {history.map((h) => (
                  <li key={h.id} className="type-meta text-text-muted">
                    {h.changed_at} · {h.from_status ?? "-"} → {h.to_status}
                    {h.note ? ` · ${h.note}` : ""}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      ) : null}
    </PageShell>
  );
}
