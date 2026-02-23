"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Inbox } from "lucide-react";
import { PageShell } from "@/components/layout/page-shell";
import { Button, Card } from "@/components/primitives";
import { EmptyState } from "@/components/patterns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProblemDetailsPanel } from "@/components/problem-details";
import { requestHal, type ProblemDetails } from "@/lib/hal-client";

type IntakeStatus = "NEW" | "TRIAGED" | "QUALIFIED" | "BOOKED" | "LOST";

type IntakeRow = {
  id: string;
  audience: "INDIVIDUAL" | "ORGANIZATION";
  contact_name: string;
  contact_email: string;
  goals: string;
  status: IntakeStatus;
  owner_user_id: string | null;
  priority: number;
  next_step: string;
  created_at: string;
};

type IntakeHistory = {
  id: string;
  from_status: IntakeStatus | null;
  to_status: IntakeStatus;
  note: string | null;
  changed_by: string | null;
  changed_at: string;
};

type IntakeDetail = IntakeRow & {
  history: IntakeHistory[];
  timeline: string | null;
  constraints: string | null;
  organization_name: string | null;
  deal_id?: string;
  deal_status?: string;
};

type IntakeListResponse = {
  count: number;
  items: IntakeRow[];
};


export default function AdminIntakePage() {
  const router = useRouter();
  const [items, setItems] = useState<IntakeRow[]>([]);
  const [selected, setSelected] = useState<IntakeDetail | null>(null);
  const [pending, setPending] = useState(false);
  const [problem, setProblem] = useState<ProblemDetails | null>(null);

  const [statusFilter, setStatusFilter] = useState<"all" | IntakeStatus>("all");
  const [ownerFilter, setOwnerFilter] = useState("unassigned");
  const [query, setQuery] = useState("");

  const [ownerDialogOpen, setOwnerDialogOpen] = useState(false);
  const [ownerDraft, setOwnerDraft] = useState("");

  const load = useCallback(async () => {
    setPending(true);

    const params = new URLSearchParams();
    if (statusFilter !== "all") {
      params.set("status", statusFilter);
    }
    if (ownerFilter.trim().length > 0) {
      params.set("owner_user_id", ownerFilter.trim());
    }
    if (query.trim().length > 0) {
      params.set("q", query.trim());
    }

    const href = params.toString().length > 0 ? `/api/v1/intake?${params.toString()}` : "/api/v1/intake";
    const response = await requestHal<IntakeListResponse>(href);

    if (!response.ok) {
      setProblem(response.problem);
      setPending(false);
      return;
    }

    setProblem(null);
    setItems(response.data.items ?? []);
    setPending(false);
  }, [statusFilter, ownerFilter, query]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void load();
    }, 0);

    return () => {
      clearTimeout(timer);
    };
  }, [load]);

  const loadDetail = async (id: string) => {
    setPending(true);
    const response = await requestHal<IntakeDetail>(`/api/v1/intake/${id}`);
    if (!response.ok) {
      setProblem(response.problem);
      setPending(false);
      return;
    }

    setSelected(response.data);
    setPending(false);
  };

  const updateSelected = async (changes: { status?: IntakeStatus; owner_user_id?: string | null; priority?: number; note?: string }) => {
    if (!selected) {
      return;
    }

    setPending(true);
    setProblem(null);

    const response = await requestHal<IntakeDetail>(`/api/v1/intake/${selected.id}`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(changes),
    });

    if (!response.ok) {
      setProblem(response.problem);
      setPending(false);
      return;
    }

    setSelected(response.data);
    await load();
    setPending(false);
  };

  const createDeal = async () => {
    if (!selected) return;
    setPending(true);
    setProblem(null);

    const response = await requestHal<{ id: string }>("/api/v1/admin/deals", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ intake_id: selected.id }),
    });

    if (!response.ok) {
      setProblem(response.problem);
      setPending(false);
      return;
    }

    setPending(false);
    router.push(`/admin/deals/${response.data.id}`);
  };

  return (
    <PageShell
      title="Intake"
      subtitle="Triage incoming service inquiries with status, ownership, and history."
      breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Intake" }]}
    >
      <Card className="p-4">
        <h2 className="type-title">Queue filters</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-4">
          <div className="space-y-1.5">
            <Label htmlFor="intake-status">Status</Label>
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as "all" | IntakeStatus)}>
              <SelectTrigger id="intake-status" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="NEW">NEW</SelectItem>
                <SelectItem value="TRIAGED">TRIAGED</SelectItem>
                <SelectItem value="QUALIFIED">QUALIFIED</SelectItem>
                <SelectItem value="BOOKED">BOOKED</SelectItem>
                <SelectItem value="LOST">LOST</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="intake-owner">Owner</Label>
            <Input id="intake-owner" placeholder="User ID or unassigned" value={ownerFilter} onChange={(event) => setOwnerFilter(event.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="intake-search">Search</Label>
            <Input id="intake-search" placeholder="Goals or contact name" value={query} onChange={(event) => setQuery(event.target.value)} />
          </div>
          <div className="flex items-end">
            <Button intent="primary" onClick={() => void load()} disabled={pending}>
              {pending ? "Loading..." : "Refresh"}
            </Button>
          </div>
        </div>
      </Card>

      {problem ? (
        <div className="mt-4">
          <ProblemDetailsPanel problem={problem} />
        </div>
      ) : null}

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <h2 className="type-title">Queue ({items.length})</h2>
          {items.length === 0 ? (
            <div className="mt-3">
              <EmptyState
                icon={<Inbox className="size-5" />}
                title="No intake requests"
                description="No requests match the current filters. Try adjusting your filters or refresh." 
                action={
                  <Button intent="secondary" onClick={() => void load()} disabled={pending}>
                    {pending ? "Loading..." : "Refresh"}
                  </Button>
                }
              />
            </div>
          ) : (
            <ul className="mt-3 space-y-2">
              {items.map((item) => (
                <li key={item.id} className="rounded-sm border border-border-default p-3">
                  <button type="button" className="w-full text-left" onClick={() => void loadDetail(item.id)}>
                    <p className="type-label">
                      {item.contact_name} ({item.audience})
                    </p>
                    <p className="type-meta text-text-muted">
                      {item.contact_email} · {item.status} · P{item.priority}
                    </p>
                    <p className="mt-1 type-meta text-text-muted line-clamp-2">{item.goals}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-4">
          <h2 className="type-title">Triage</h2>
          {selected ? (
            <div className="mt-3 space-y-3">
              <p className="type-label">{selected.contact_name}</p>
              <p className="type-meta text-text-muted">{selected.contact_email}</p>
              <p className="type-body-sm text-text-secondary">{selected.goals}</p>
              {selected.organization_name ? <p className="type-meta text-text-muted">Organization: {selected.organization_name}</p> : null}
              {selected.timeline ? <p className="type-meta text-text-muted">Timeline: {selected.timeline}</p> : null}
              {selected.constraints ? <p className="type-meta text-text-muted">Constraints: {selected.constraints}</p> : null}

              <div className="rounded-sm border border-border-default bg-surface p-3">
                <p className="type-label text-text-primary">Deal</p>
                {selected.deal_id ? (
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <p className="type-meta text-text-muted">Status: {selected.deal_status ?? "-"}</p>
                    <Link href={`/admin/deals/${selected.deal_id}`} className="type-label underline">
                      Open deal
                    </Link>
                  </div>
                ) : (
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <p className="type-meta text-text-muted">No deal created yet.</p>
                    <Button size="sm" intent="primary" onClick={() => void createDeal()} disabled={pending}>
                      Create deal
                    </Button>
                  </div>
                )}
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="triage-status">Status</Label>
                  <Select
                    value={selected.status}
                    onValueChange={(value) => {
                      void updateSelected({ status: value as IntakeStatus, note: "Status updated in admin queue" });
                    }}
                  >
                    <SelectTrigger id="triage-status" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NEW">NEW</SelectItem>
                      <SelectItem value="TRIAGED">TRIAGED</SelectItem>
                      <SelectItem value="QUALIFIED">QUALIFIED</SelectItem>
                      <SelectItem value="BOOKED">BOOKED</SelectItem>
                      <SelectItem value="LOST">LOST</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="triage-priority">Priority</Label>
                  <Input
                    id="triage-priority"
                    value={String(selected.priority)}
                    onChange={(event) => {
                      const value = Number(event.target.value);
                      if (Number.isInteger(value)) {
                        void updateSelected({ priority: value });
                      }
                    }}
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" intent="secondary" onClick={() => void updateSelected({ owner_user_id: null })}>
                  Unassign
                </Button>
                <Button
                  size="sm"
                  intent="secondary"
                  onClick={() => {
                    setOwnerDraft(selected.owner_user_id ?? "");
                    setOwnerDialogOpen(true);
                  }}
                >
                  Assign owner
                </Button>
              </div>

              <div>
                <h3 className="type-label">Status history</h3>
                <ul className="mt-2 space-y-1">
                  {selected.history.map((entry) => (
                    <li key={entry.id} className="type-meta text-text-muted">
                      {entry.changed_at} · {entry.from_status ?? "-"} → {entry.to_status}
                      {entry.note ? ` · ${entry.note}` : ""}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <p className="mt-3 type-body-sm text-text-secondary">Select a request to view triage details.</p>
          )}
        </Card>
      </div>

      <AlertDialog
        open={ownerDialogOpen}
        onOpenChange={(open) => {
          setOwnerDialogOpen(open);
          if (!open) {
            setOwnerDraft("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Assign owner</AlertDialogTitle>
            <AlertDialogDescription>Set the user id responsible for this intake request.</AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-1.5">
            <Label htmlFor="intake-owner-dialog">Owner user id</Label>
            <Input
              id="intake-owner-dialog"
              value={ownerDraft}
              onChange={(event) => setOwnerDraft(event.target.value)}
              placeholder="e.g., usr_abc123"
            />
            <p className="type-meta text-text-muted">Leave blank to unassign.</p>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={pending || !selected}
              onClick={() => {
                if (!selected) {
                  return;
                }
                const nextOwner = ownerDraft.trim();
                setOwnerDialogOpen(false);
                void updateSelected({ owner_user_id: nextOwner.length > 0 ? nextOwner : null });
              }}
            >
              Assign
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageShell>
  );
}
