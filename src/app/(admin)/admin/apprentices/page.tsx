"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { PageShell } from "@/components/layout/page-shell";
import { Button, Card } from "@/components/primitives";
import { ProblemDetailsPanel } from "@/components/problem-details";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { requestHal, type ProblemDetails } from "@/lib/hal-client";

type ApprenticeProfileStatus = "PENDING" | "APPROVED" | "SUSPENDED";

type ApprenticeProfileRow = {
  user_id: string;
  handle: string;
  display_name: string;
  headline: string | null;
  website_url: string | null;
  status: ApprenticeProfileStatus;
  created_at: string;
  updated_at: string;
  suspension_reason: string | null;
};

type AdminListResponse = {
  count: number;
  items: ApprenticeProfileRow[];
};

type GateSubmissionRow = {
  id: string;
  user_id: string;
  gate_project_id: string;
  status: "SUBMITTED" | "IN_REVIEW" | "PASSED" | "REVISION_NEEDED";
  submission_url: string | null;
  submission_notes: string | null;
  reviewer_notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields from progress endpoint
  gate_project_title?: string;
  apprentice_handle?: string;
  apprentice_name?: string;
};

export default function AdminApprenticesPage() {
  const [status, setStatus] = useState<"all" | ApprenticeProfileStatus>("all");
  const [query, setQuery] = useState("");
  const [pending, setPending] = useState(true);
  const [problem, setProblem] = useState<ProblemDetails | null>(null);
  const [items, setItems] = useState<ApprenticeProfileRow[]>([]);

  const [mutatingId, setMutatingId] = useState<string | null>(null);
  const [suspendReason, setSuspendReason] = useState("");

  // Gate submissions state
  const [submissions, setSubmissions] = useState<GateSubmissionRow[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");

  const load = useCallback(async () => {
    setPending(true);
    const params = new URLSearchParams();
    if (status !== "all") {
      params.set("status", status);
    }

    const href = params.toString().length > 0 ? `/api/v1/admin/apprentices?${params.toString()}` : "/api/v1/admin/apprentices";
    const response = await requestHal<AdminListResponse>(href);
    if (!response.ok) {
      setProblem(response.problem);
      setPending(false);
      return;
    }

    setProblem(null);
    setItems(response.data.items ?? []);
    setPending(false);
  }, [status]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => {
      return (
        item.display_name.toLowerCase().includes(q) ||
        item.handle.toLowerCase().includes(q) ||
        (item.website_url ?? "").toLowerCase().includes(q)
      );
    });
  }, [items, query]);

  const setProfileStatus = async (userId: string, next: ApprenticeProfileStatus, reason?: string) => {
    setMutatingId(userId);
    setProblem(null);

    const response = await requestHal<ApprenticeProfileRow>(`/api/v1/admin/apprentices/${userId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: next, reason: reason ?? null }),
    });

    if (!response.ok) {
      setProblem(response.problem);
      setMutatingId(null);
      return;
    }

    await load();
    setMutatingId(null);
  };

  const loadSubmissions = useCallback(async () => {
    setLoadingSubmissions(true);
    // Load submissions for each approved apprentice that has a handle
    const allSubs: GateSubmissionRow[] = [];
    for (const item of items.filter((i) => i.handle)) {
      const res = await requestHal<{ submissions: GateSubmissionRow[] }>(
        `/api/v1/apprentices/${item.handle}/progress`,
      );
      if (res.ok && res.data.submissions) {
        const pending = res.data.submissions
          .filter((s: GateSubmissionRow) => s.status === "SUBMITTED" || s.status === "IN_REVIEW")
          .map((s: GateSubmissionRow) => ({ ...s, apprentice_handle: item.handle, apprentice_name: item.display_name }));
        allSubs.push(...pending);
      }
    }
    setSubmissions(allSubs);
    setLoadingSubmissions(false);
  }, [items]);

  useEffect(() => {
    if (items.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void loadSubmissions();
    }
  }, [items, loadSubmissions]);

  const reviewSubmission = async (handle: string, submissionId: string, verdict: "PASSED" | "REVISION_NEEDED") => {
    setReviewingId(submissionId);
    setProblem(null);

    const response = await requestHal<GateSubmissionRow>(
      `/api/v1/apprentices/${handle}/gate-submissions/${submissionId}`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: verdict, reviewer_notes: reviewNotes || null }),
      },
    );

    if (!response.ok) {
      setProblem(response.problem);
      setReviewingId(null);
      return;
    }

    setReviewNotes("");
    setReviewingId(null);
    await loadSubmissions();
  };

  return (
    <PageShell
      title="Apprentices"
      subtitle="Approve and manage public apprentice profiles."
      breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Apprentices" }]}
    >
      <Card className="p-4">
        <h2 className="type-title">Filters</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="ap-status">Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as "all" | ApprenticeProfileStatus)}>
              <SelectTrigger id="ap-status" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="PENDING">PENDING</SelectItem>
                <SelectItem value="APPROVED">APPROVED</SelectItem>
                <SelectItem value="SUSPENDED">SUSPENDED</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ap-search">Search</Label>
            <Input id="ap-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="name, handle, website" />
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
        <h2 className="type-title">Profiles ({filtered.length})</h2>

        {filtered.length === 0 ? (
          <p className="mt-3 type-meta text-text-muted">No profiles match the current filters.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-sm" aria-label="Apprentice profiles table">
              <thead>
                <tr>
                  <th scope="col" className="pb-2">Name</th>
                  <th scope="col" className="pb-2">Handle</th>
                  <th scope="col" className="pb-2">Status</th>
                  <th scope="col" className="pb-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={item.user_id} className="border-t border-border-default">
                    <td className="py-2 pr-3">
                      <p className="type-label text-text-primary">{item.display_name}</p>
                      {item.website_url ? (
                        <a className="type-meta underline" href={item.website_url} target="_blank" rel="noreferrer">
                          {item.website_url}
                        </a>
                      ) : null}
                      {item.suspension_reason ? (
                        <p className="type-meta text-text-muted">Suspension: {item.suspension_reason}</p>
                      ) : null}
                    </td>
                    <td className="py-2 pr-3">
                      <p className="type-meta text-text-secondary">{item.handle}</p>
                    </td>
                    <td className="py-2 pr-3">
                      <p className="type-meta text-text-secondary">{item.status}</p>
                    </td>
                    <td className="py-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          intent="secondary"
                          disabled={mutatingId === item.user_id || item.status === "APPROVED"}
                          onClick={() => void setProfileStatus(item.user_id, "APPROVED")}
                        >
                          Approve
                        </Button>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button intent="secondary" disabled={mutatingId === item.user_id || item.status === "SUSPENDED"}>
                              Suspend
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Suspend profile</AlertDialogTitle>
                              <AlertDialogDescription>
                                Suspending removes the apprentice from the public directory.
                              </AlertDialogDescription>
                            </AlertDialogHeader>

                            <div className="mt-3 space-y-1.5">
                              <Label htmlFor="ap-suspend-reason">Reason (optional)</Label>
                              <Input
                                id="ap-suspend-reason"
                                value={suspendReason}
                                onChange={(e) => setSuspendReason(e.target.value)}
                                placeholder="e.g., incomplete disclosure"
                              />
                            </div>

                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => {
                                  void setProfileStatus(item.user_id, "SUSPENDED", suspendReason);
                                  setSuspendReason("");
                                }}
                              >
                                Suspend
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="mt-4 p-4">
        <h2 className="type-title">Gate Submissions for Review ({submissions.length})</h2>

        {loadingSubmissions ? (
          <p className="mt-3 type-meta text-text-muted">Loading submissions…</p>
        ) : submissions.length === 0 ? (
          <p className="mt-3 type-meta text-text-muted">No pending gate submissions.</p>
        ) : (
          <div className="mt-3 space-y-3">
            {submissions.map((sub) => (
              <div key={sub.id} className="rounded border border-border-default p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{sub.status}</Badge>
                  {sub.apprentice_name ? (
                    <span className="type-label text-text-primary">{sub.apprentice_name}</span>
                  ) : null}
                  <span className="type-meta text-text-muted">@{sub.apprentice_handle}</span>
                </div>
                {sub.submission_notes ? (
                  <p className="mt-2 type-body-sm text-text-secondary">{sub.submission_notes}</p>
                ) : null}
                {sub.submission_url ? (
                  <a
                    className="mt-1 block type-meta underline"
                    href={sub.submission_url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {sub.submission_url}
                  </a>
                ) : null}
                <p className="mt-1 type-meta text-text-muted">
                  Submitted {new Date(sub.created_at).toLocaleDateString()}
                </p>

                <div className="mt-3 space-y-2">
                  <div className="space-y-1.5">
                    <Label htmlFor={`review-notes-${sub.id}`}>Review notes</Label>
                    <Input
                      id={`review-notes-${sub.id}`}
                      value={reviewingId === sub.id ? reviewNotes : ""}
                      onChange={(e) => {
                        setReviewingId(sub.id);
                        setReviewNotes(e.target.value);
                      }}
                      placeholder="Optional review feedback"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      intent="primary"
                      disabled={reviewingId !== null && reviewingId !== sub.id}
                      onClick={() => void reviewSubmission(sub.apprentice_handle ?? "", sub.id, "PASSED")}
                    >
                      Pass
                    </Button>
                    <Button
                      intent="secondary"
                      disabled={reviewingId !== null && reviewingId !== sub.id}
                      onClick={() => void reviewSubmission(sub.apprentice_handle ?? "", sub.id, "REVISION_NEEDED")}
                    >
                      Request Revision
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </PageShell>
  );
}
