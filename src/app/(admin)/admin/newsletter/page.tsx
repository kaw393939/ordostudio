"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { PageShell } from "@/components/layout/page-shell";
import { Button, Card } from "@/components/primitives";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ProblemDetailsPanel } from "@/components/problem-details";
import { requestHal, type ProblemDetails } from "@/lib/hal-client";
import { Badge } from "@/components/ui/badge";
import { RelativeTime } from "@/components/forms";

type NewsletterIssue = {
  id: string;
  title: string;
  issue_date: string;
  status: "DRAFT" | "REVIEWED" | "PUBLISHED";
  created_at: string;
};

type NewsletterListResponse = {
  count: number;
  items: NewsletterIssue[];
};

const statusVariant = (status: NewsletterIssue["status"]) => {
  if (status === "PUBLISHED") return "secondary" as const;
  if (status === "REVIEWED") return "outline" as const;
  return "outline" as const;
};

export default function AdminNewsletterPage() {
  const [items, setItems] = useState<NewsletterIssue[]>([]);
  const [pending, setPending] = useState(true);
  const [problem, setProblem] = useState<ProblemDetails | null>(null);
  const [focusedId, setFocusedId] = useState<string | null>(null);

  const [title, setTitle] = useState("Ordo Brief");
  const [issueDate, setIssueDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setPending(true);
    const result = await requestHal<NewsletterListResponse>("/api/v1/admin/newsletter");
    if (!result.ok) {
      setProblem(result.problem);
      setItems([]);
      setPending(false);
      return;
    }

    setProblem(null);
    setItems(result.data.items ?? []);
    setFocusedId((current) => {
      const nextItems = result.data.items ?? [];
      if (!current) return nextItems.length > 0 ? nextItems[0].id : null;
      return nextItems.some((row) => row.id === current) ? current : (nextItems.length > 0 ? nextItems[0].id : null);
    });
    setPending(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const onCreate = async () => {
    setCreating(true);
    setProblem(null);

    const result = await requestHal<NewsletterIssue>("/api/v1/admin/newsletter", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title, issue_date: issueDate }),
    });

    if (!result.ok) {
      setProblem(result.problem);
      setCreating(false);
      return;
    }

    setCreating(false);
    await load();
  };

  const focused = useMemo(() => {
    if (!focusedId) return null;
    return items.find((row) => row.id === focusedId) ?? null;
  }, [focusedId, items]);

  return (
    <PageShell
      title="Newsletter"
      subtitle="Drafts, review, publish, export."
      breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Newsletter" }]}
    >
      <Card className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="type-title">Work queue</h2>
            <p className="mt-1 type-meta text-text-muted">Step 1: pick an issue. Step 2: edit and publish.</p>
          </div>
          <Button intent="secondary" onClick={() => void load()} disabled={pending || creating}>
            Refresh
          </Button>
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
              <p className="mt-1 type-meta text-text-muted">Issues ({items.length})</p>
            </div>
            <Badge variant="outline">{items.length}</Badge>
          </div>

          {items.length === 0 && !pending ? <p className="mt-3 type-meta text-text-muted">No issues yet.</p> : null}

          {items.length > 0 ? (
            <ul className="mt-3 space-y-2">
              {items.map((item) => (
                <li
                  key={item.id}
                  className={
                    focusedId === item.id
                      ? "rounded-sm border border-border-default bg-action-secondary/30 p-3"
                      : "rounded-sm border border-border-default p-3"
                  }
                >
                  <button
                    type="button"
                    className="w-full text-left"
                    aria-current={focusedId === item.id ? "true" : undefined}
                    onClick={() => setFocusedId(item.id)}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="type-label text-text-primary line-clamp-1">{item.title}</p>
                      <Badge variant={statusVariant(item.status)}>{item.status}</Badge>
                    </div>
                    <p className="mt-1 type-meta text-text-muted">{item.issue_date}</p>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </Card>

        <Card className="p-4">
          <h2 className="type-title">Issue</h2>

          {focused ? (
            <div className="mt-3 space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="type-label text-text-primary">{focused.title}</p>
                  <p className="mt-1 type-meta text-text-muted">
                    {focused.issue_date} · <RelativeTime iso={focused.created_at} />
                  </p>
                </div>
                <Link href={`/admin/newsletter/${focused.id}`} className="type-label underline">
                  Open
                </Link>
              </div>

              <details className="surface rounded-sm border border-border-default p-3" open>
                <summary className="cursor-pointer type-label text-text-primary">Create new issue</summary>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="issue-title">Title</Label>
                    <Input id="issue-title" value={title} onChange={(e) => setTitle(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="issue-date">Issue date</Label>
                    <Input
                      id="issue-date"
                      value={issueDate}
                      onChange={(e) => setIssueDate(e.target.value)}
                      placeholder="YYYY-MM-DD"
                    />
                  </div>
                </div>

                <Button intent="primary" className="mt-3" onClick={() => void onCreate()} disabled={creating}>
                  {creating ? "Creating…" : "Create issue"}
                </Button>
              </details>
            </div>
          ) : (
            <div className="mt-3 space-y-3">
              <p className="type-body-sm text-text-secondary">Step 2: choose an issue from the queue.</p>

              <details className="surface rounded-sm border border-border-default p-3" open>
                <summary className="cursor-pointer type-label text-text-primary">Create first issue</summary>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="issue-title">Title</Label>
                    <Input id="issue-title" value={title} onChange={(e) => setTitle(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="issue-date">Issue date</Label>
                    <Input
                      id="issue-date"
                      value={issueDate}
                      onChange={(e) => setIssueDate(e.target.value)}
                      placeholder="YYYY-MM-DD"
                    />
                  </div>
                </div>

                <Button intent="primary" className="mt-3" onClick={() => void onCreate()} disabled={creating}>
                  {creating ? "Creating…" : "Create issue"}
                </Button>
              </details>
            </div>
          )}
        </Card>
      </div>
    </PageShell>
  );
}
