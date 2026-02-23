"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

import { PageShell } from "@/components/layout/page-shell";
import { Button, Card } from "@/components/primitives";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ProblemDetailsPanel } from "@/components/problem-details";
import { requestHal, type ProblemDetails } from "@/lib/hal-client";

type NewsletterStatus = "DRAFT" | "REVIEWED" | "PUBLISHED";

type NewsletterSection = "MODELS" | "MONEY" | "PEOPLE" | "FROM_FIELD" | "NEXT_STEPS";

type NewsletterIssueDetail = {
  id: string;
  title: string;
  issue_date: string;
  status: NewsletterStatus;
  scheduled_for?: string | null;
  blocks: Record<NewsletterSection, { content_md: string }>;
  provenance: Record<NewsletterSection, { field_reports: Array<{ id: string; event_title: string; user_email: string }>; research_sources: Array<{ url: string; title: string | null }> }>;
};

type NewsletterSendRun = {
  id: string;
  issue_id: string;
  scheduled_for: string;
  sent_at: string | null;
  attempted_count: number;
  sent_count: number;
  bounced_count: number;
};

const sectionTitle: Record<NewsletterSection, string> = {
  MODELS: "Models",
  MONEY: "Money",
  PEOPLE: "People",
  FROM_FIELD: "From the field",
  NEXT_STEPS: "What to do next",
};

const statusVariant = (status: NewsletterStatus) => {
  if (status === "PUBLISHED") return "secondary" as const;
  if (status === "REVIEWED") return "outline" as const;
  return "outline" as const;
};

export default function AdminNewsletterIssuePage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [issue, setIssue] = useState<NewsletterIssueDetail | null>(null);
  const [pending, setPending] = useState(true);
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState<ProblemDetails | null>(null);

  const [runs, setRuns] = useState<NewsletterSendRun[]>([]);
  const [runsLoading, setRunsLoading] = useState(false);
  const [scheduledFor, setScheduledFor] = useState("");

  const [title, setTitle] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [blocks, setBlocks] = useState<Record<NewsletterSection, string>>({
    MODELS: "",
    MONEY: "",
    PEOPLE: "",
    FROM_FIELD: "",
    NEXT_STEPS: "",
  });

  const load = useCallback(async () => {
    setPending(true);
    const result = await requestHal<NewsletterIssueDetail>(`/api/v1/admin/newsletter/${id}`);
    if (!result.ok) {
      setProblem(result.problem);
      setIssue(null);
      setPending(false);
      return;
    }

    setProblem(null);
    setIssue(result.data);
    setTitle(result.data.title);
    setIssueDate(result.data.issue_date);
    setScheduledFor(result.data.scheduled_for ?? "");
    setBlocks({
      MODELS: result.data.blocks.MODELS?.content_md ?? "",
      MONEY: result.data.blocks.MONEY?.content_md ?? "",
      PEOPLE: result.data.blocks.PEOPLE?.content_md ?? "",
      FROM_FIELD: result.data.blocks.FROM_FIELD?.content_md ?? "",
      NEXT_STEPS: result.data.blocks.NEXT_STEPS?.content_md ?? "",
    });
    setPending(false);
  }, [id]);

  const loadRuns = useCallback(async () => {
    setRunsLoading(true);
    const result = await requestHal<{ items: NewsletterSendRun[] }>(`/api/v1/admin/newsletter/${id}/send-runs`);
    if (!result.ok) {
      setRuns([]);
      setRunsLoading(false);
      return;
    }

    setRuns(result.data.items ?? []);
    setRunsLoading(false);
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadRuns();
  }, [loadRuns]);

  const onSave = async () => {
    setSaving(true);
    setProblem(null);

    const result = await requestHal<NewsletterIssueDetail>(`/api/v1/admin/newsletter/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title,
        issue_date: issueDate,
        blocks,
      }),
    });

    if (!result.ok) {
      setProblem(result.problem);
      setSaving(false);
      return;
    }

    setIssue(result.data);
    setSaving(false);
  };

  const onGenerate = async () => {
    setSaving(true);
    setProblem(null);

    const result = await requestHal<NewsletterIssueDetail>(`/api/v1/admin/newsletter/${id}/generate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });

    if (!result.ok) {
      setProblem(result.problem);
      setSaving(false);
      return;
    }

    setIssue(result.data);
    setBlocks({
      MODELS: result.data.blocks.MODELS?.content_md ?? "",
      MONEY: result.data.blocks.MONEY?.content_md ?? "",
      PEOPLE: result.data.blocks.PEOPLE?.content_md ?? "",
      FROM_FIELD: result.data.blocks.FROM_FIELD?.content_md ?? "",
      NEXT_STEPS: result.data.blocks.NEXT_STEPS?.content_md ?? "",
    });
    setSaving(false);
  };

  const onReview = async () => {
    setSaving(true);
    setProblem(null);

    const result = await requestHal<NewsletterIssueDetail>(`/api/v1/admin/newsletter/${id}/review`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });

    if (!result.ok) {
      setProblem(result.problem);
      setSaving(false);
      return;
    }

    setIssue(result.data);
    setSaving(false);
  };

  const onPublish = async () => {
    setSaving(true);
    setProblem(null);

    const result = await requestHal<NewsletterIssueDetail>(`/api/v1/admin/newsletter/${id}/publish`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ confirm: "PUBLISH" }),
    });

    if (!result.ok) {
      setProblem(result.problem);
      setSaving(false);
      return;
    }

    setIssue(result.data);
    setSaving(false);
  };

  const sections = useMemo(() => (Object.keys(sectionTitle) as NewsletterSection[]), []);

  const onScheduleSend = async () => {
    setSaving(true);
    setProblem(null);

    const result = await requestHal<NewsletterSendRun>(`/api/v1/admin/newsletter/${id}/schedule`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ scheduled_for: scheduledFor }),
    });

    if (!result.ok) {
      setProblem(result.problem);
      setSaving(false);
      return;
    }

    await load();
    await loadRuns();
    setSaving(false);
  };

  return (
    <PageShell title="Ordo Brief" subtitle="Draft → Review → Publish with preserved provenance.">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/admin/newsletter" className="type-label underline">
            Back to issues
          </Link>
          <Link href={`/api/v1/admin/newsletter/${id}/export`} className="type-label underline">
            Export markdown
          </Link>
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

      {issue ? (
        <Card className="mt-4 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="type-meta text-text-muted">Status</p>
              <div className="mt-1 flex items-center gap-2">
                <Badge variant={statusVariant(issue.status)}>{issue.status}</Badge>
                <span className="type-meta text-text-muted">{issue.id}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button intent="secondary" onClick={() => void onGenerate()} disabled={saving}>
                {saving ? "Working…" : "Generate draft"}
              </Button>
              <Button intent="secondary" onClick={() => void onReview()} disabled={saving || issue.status === "PUBLISHED"}>
                Mark reviewed
              </Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button intent="primary" disabled={saving || issue.status === "PUBLISHED"}>
                    Publish
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Publish issue</AlertDialogTitle>
                    <AlertDialogDescription>
                      Publishing is irreversible. This requires the issue to be reviewed.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => void onPublish()}>Publish</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <Button intent="primary" onClick={() => void onSave()} disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>

          <div className="mt-4 rounded-sm border border-border-default bg-surface p-4">
            <h2 className="type-title text-text-primary">Sending</h2>
            <p className="mt-1 type-meta text-text-muted">Schedule sends for published issues and review run counts.</p>

            <div className="mt-3 grid gap-3 md:grid-cols-3">
              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="brief-scheduled">Scheduled for (ISO timestamp)</Label>
                <Input
                  id="brief-scheduled"
                  value={scheduledFor}
                  onChange={(e) => setScheduledFor(e.target.value)}
                  placeholder="2026-09-08T15:00:00.000Z"
                />
              </div>
              <div className="flex items-end">
                <Button intent="primary" onClick={() => void onScheduleSend()} disabled={saving} className="w-full">
                  {saving ? "Working…" : "Schedule send"}
                </Button>
              </div>
            </div>

            <div className="mt-4">
              <div className="flex items-center justify-between gap-2">
                <p className="type-label text-text-primary">Send runs</p>
                <Button intent="secondary" onClick={() => void loadRuns()} disabled={runsLoading}>
                  Refresh runs
                </Button>
              </div>

              {runsLoading ? <p className="mt-2 type-meta text-text-muted">Loading runs…</p> : null}

              {!runsLoading && runs.length === 0 ? (
                <p className="mt-2 type-meta text-text-muted">No send runs yet.</p>
              ) : null}

              {!runsLoading && runs.length > 0 ? (
                <div className="mt-2 overflow-auto rounded-sm border border-border-default">
                  <table className="min-w-full divide-y divide-border-default text-sm">
                    <thead className="bg-surface-muted">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium">Scheduled</th>
                        <th className="px-3 py-2 text-left font-medium">Sent at</th>
                        <th className="px-3 py-2 text-right font-medium">Attempted</th>
                        <th className="px-3 py-2 text-right font-medium">Delivered</th>
                        <th className="px-3 py-2 text-right font-medium">Bounced</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-default">
                      {runs.map((run) => (
                        <tr key={run.id}>
                          <td className="px-3 py-2 whitespace-nowrap text-text-secondary">{run.scheduled_for}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-text-secondary">{run.sent_at ?? "—"}</td>
                          <td className="px-3 py-2 text-right text-text-secondary">{run.attempted_count}</td>
                          <td className="px-3 py-2 text-right text-text-secondary">{run.sent_count}</td>
                          <td className="px-3 py-2 text-right text-text-secondary">{run.bounced_count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="brief-title">Title</Label>
              <Input id="brief-title" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="brief-date">Issue date</Label>
              <Input id="brief-date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} placeholder="YYYY-MM-DD" />
            </div>
          </div>

          <div className="mt-6 grid gap-4">
            {sections.map((section) => {
              const prov = issue.provenance[section];
              return (
                <div key={section} className="rounded-sm border border-border-default bg-surface p-4">
                  <h2 className="type-title text-text-primary">{sectionTitle[section]}</h2>
                  <p className="mt-1 type-meta text-text-muted">Edit content without losing provenance.</p>

                  <Textarea
                    className="mt-3 min-h-32"
                    value={blocks[section]}
                    onChange={(e) => setBlocks((current) => ({ ...current, [section]: e.target.value }))}
                  />

                  <div className="mt-3 grid gap-2">
                    <p className="type-label text-text-primary">Provenance</p>
                    <div className="grid gap-2 md:grid-cols-2">
                      <div>
                        <p className="type-meta text-text-muted">Field reports</p>
                        <ul className="mt-1 list-disc space-y-1 pl-5 type-meta text-text-secondary">
                          {prov.field_reports.length === 0 ? <li className="text-text-muted">(None)</li> : null}
                          {prov.field_reports.map((fr) => (
                            <li key={fr.id}>
                              <Link href={`/admin/field-reports/${fr.id}`} className="underline">
                                {fr.event_title}
                              </Link>{" "}
                              <span className="text-text-muted">({fr.user_email})</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="type-meta text-text-muted">Research</p>
                        <ul className="mt-1 list-disc space-y-1 pl-5 type-meta text-text-secondary">
                          {prov.research_sources.length === 0 ? <li className="text-text-muted">(None)</li> : null}
                          {prov.research_sources.map((rs) => (
                            <li key={rs.url}>
                              <a href={rs.url} className="underline" target="_blank" rel="noreferrer">
                                {rs.title ? rs.title : rs.url}
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      ) : null}
    </PageShell>
  );
}
