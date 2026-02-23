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
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProblemDetailsPanel } from "@/components/problem-details";
import { RelativeTime } from "@/components/forms";
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

type MeResponse = {
  id: string;
  email: string;
  status: string;
  roles: string[];
  last_login_at: string | null;
};

type BadgeVariant = "default" | "secondary" | "destructive" | "outline" | "ghost" | "link";

const statusVariant = (status: IntakeStatus): BadgeVariant => {
  if (status === "NEW") return "outline";
  if (status === "TRIAGED") return "secondary";
  if (status === "LOST") return "destructive";
  return "default";
};

const priorityLabel = (priority: number): string => {
  if (priority >= 80) return "High";
  if (priority <= 20) return "Low";
  return "Normal";
};

export default function AdminIntakePage() {
  const router = useRouter();
  const [items, setItems] = useState<IntakeRow[]>([]);
  const [selected, setSelected] = useState<IntakeDetail | null>(null);
  const [pending, setPending] = useState(false);
  const [problem, setProblem] = useState<ProblemDetails | null>(null);

  const [me, setMe] = useState<MeResponse | null>(null);

  const [statusFilter, setStatusFilter] = useState<"all" | IntakeStatus>("all");
  const [ownerFilterMode, setOwnerFilterMode] = useState<"all" | "unassigned" | "me" | "custom">("unassigned");
  const [ownerCustom, setOwnerCustom] = useState("");
  const [query, setQuery] = useState("");

  const [ownerDialogOpen, setOwnerDialogOpen] = useState(false);
  const [ownerDraft, setOwnerDraft] = useState("");

  useEffect(() => {
    let cancelled = false;

    const loadMe = async () => {
      const res = await requestHal<MeResponse>("/api/v1/me");
      if (cancelled) return;
      if (!res.ok) {
        setMe(null);
        return;
      }
      setMe(res.data);
    };

    void loadMe();
    return () => {
      cancelled = true;
    };
  }, []);

  const load = useCallback(async () => {
    setPending(true);

    const params = new URLSearchParams();
    if (statusFilter !== "all") {
      params.set("status", statusFilter);
    }
    if (ownerFilterMode === "unassigned") {
      params.set("owner_user_id", "unassigned");
    } else if (ownerFilterMode === "me") {
      if (me?.id) {
        params.set("owner_user_id", me.id);
      }
    } else if (ownerFilterMode === "custom") {
      if (ownerCustom.trim().length > 0) {
        params.set("owner_user_id", ownerCustom.trim());
      }
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
  }, [statusFilter, ownerFilterMode, ownerCustom, query, me]);

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
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="type-title">Filters</h2>
            <p className="mt-1 type-meta text-text-muted">Default view is unassigned requests so you can triage the next one quickly.</p>
          </div>
          <Button intent="primary" onClick={() => void load()} disabled={pending}>
            {pending ? "Loading..." : "Refresh"}
          </Button>
        </div>
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
            <Select value={ownerFilterMode} onValueChange={(value) => setOwnerFilterMode(value as typeof ownerFilterMode)}>
              <SelectTrigger id="intake-owner" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                <SelectItem value="me" disabled={!me?.id}>
                  Me
                </SelectItem>
                <SelectItem value="custom">Custom user id</SelectItem>
              </SelectContent>
            </Select>
            {ownerFilterMode === "custom" ? (
              <Input
                className="mt-2"
                placeholder="e.g., usr_abc123"
                value={ownerCustom}
                onChange={(event) => setOwnerCustom(event.target.value)}
              />
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="intake-search">Search</Label>
            <Input id="intake-search" placeholder="Goals or contact name" value={query} onChange={(event) => setQuery(event.target.value)} />
          </div>
          <div className="hidden md:block" />
        </div>
      </Card>

      {problem ? (
        <div className="mt-4">
          <ProblemDetailsPanel problem={problem} />
        </div>
      ) : null}

      <div className="mt-4 grid gap-4 lg:grid-cols-[22rem,1fr]">
        <Card className="p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="type-title">Queue</h2>
              <p className="mt-1 type-meta text-text-muted">Step 1: pick a request to triage.</p>
            </div>
            <Badge variant="outline">{items.length}</Badge>
          </div>
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
                <li
                  key={item.id}
                  className={
                    selected?.id === item.id
                      ? "rounded-sm border border-border-default bg-action-secondary/30 p-3"
                      : "rounded-sm border border-border-default p-3"
                  }
                >
                  <button
                    type="button"
                    className="w-full text-left"
                    aria-current={selected?.id === item.id ? "true" : undefined}
                    onClick={() => void loadDetail(item.id)}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="type-label text-text-primary">{item.contact_name}</p>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={statusVariant(item.status)}>{item.status}</Badge>
                        <Badge variant="outline">P{item.priority}</Badge>
                      </div>
                    </div>
                    <p className="type-meta text-text-muted">{item.contact_email} · {item.audience}</p>
                    <p className="mt-1 type-meta text-text-muted">
                      Created: <RelativeTime iso={item.created_at} />
                      {item.owner_user_id ? ` · Owner: ${item.owner_user_id}` : " · Owner: unassigned"}
                    </p>
                    <p className="mt-2 type-meta text-text-muted line-clamp-2">{item.goals}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-4">
          <h2 className="type-title">Triage</h2>
          {selected ? (
            <div className="mt-3 space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="type-label text-text-primary">{selected.contact_name}</p>
                  <p className="type-meta text-text-muted">{selected.contact_email}</p>
                  <p className="mt-1 type-meta text-text-muted">
                    Created: <RelativeTime iso={selected.created_at} />
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={statusVariant(selected.status)}>{selected.status}</Badge>
                  <Badge variant="outline">P{selected.priority}</Badge>
                  <Badge variant="outline">{priorityLabel(selected.priority)}</Badge>
                  <Badge variant="outline">{selected.audience}</Badge>
                  <Badge variant="outline">{selected.owner_user_id ? `Owner: ${selected.owner_user_id}` : "Owner: unassigned"}</Badge>
                </div>
              </div>

              <Card className="p-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="type-label text-text-primary">Next action</p>
                    <p className="mt-1 type-meta text-text-muted">Convert this request into a deal and assign an owner.</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {selected.deal_id ? (
                      <Link href={`/admin/deals/${selected.deal_id}`} className="type-label underline">
                        Open deal
                      </Link>
                    ) : (
                      <Button size="sm" intent="primary" onClick={() => void createDeal()} disabled={pending}>
                        Create deal
                      </Button>
                    )}

                    <Button
                      size="sm"
                      intent="secondary"
                      onClick={() => {
                        setOwnerDraft(selected.owner_user_id ?? "");
                        setOwnerDialogOpen(true);
                      }}
                      disabled={pending}
                    >
                      Assign owner
                    </Button>

                    {me?.id ? (
                      <Button
                        size="sm"
                        intent="secondary"
                        disabled={pending || selected.owner_user_id === me.id}
                        onClick={() => void updateSelected({ owner_user_id: me.id, note: "Assigned to me" })}
                      >
                        Assign to me
                      </Button>
                    ) : null}

                    <Button size="sm" intent="secondary" onClick={() => void updateSelected({ owner_user_id: null })} disabled={pending}>
                      Unassign
                    </Button>
                  </div>
                </div>
              </Card>

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
                  <Select
                    value={String(selected.priority)}
                    onValueChange={(value) => {
                      const next = Number(value);
                      if (Number.isInteger(next)) {
                        void updateSelected({ priority: next });
                      }
                    }}
                  >
                    <SelectTrigger id="triage-priority" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="100">100 (High)</SelectItem>
                      <SelectItem value="50">50 (Normal)</SelectItem>
                      <SelectItem value="10">10 (Low)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <details className="surface rounded-sm border border-border-default p-3">
                <summary className="cursor-pointer type-label text-text-primary">Request details</summary>
                <div className="mt-3 space-y-2">
                  <p className="type-body-sm text-text-secondary whitespace-pre-wrap">{selected.goals}</p>
                  {selected.organization_name ? <p className="type-meta text-text-muted">Organization: {selected.organization_name}</p> : null}
                  {selected.timeline ? <p className="type-meta text-text-muted">Timeline: {selected.timeline}</p> : null}
                  {selected.constraints ? <p className="type-meta text-text-muted">Constraints: {selected.constraints}</p> : null}
                </div>
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
            <div className="mt-3">
              <EmptyState
                title="Select a request"
                description="Step 2: choose a request from the queue to triage it here."
              />
            </div>
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
