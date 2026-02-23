"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { PageShell } from "@/components/layout/page-shell";
import { Button, Card } from "@/components/primitives";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ProblemDetailsPanel } from "@/components/problem-details";
import { requestHal, type ProblemDetails } from "@/lib/hal-client";
import { Badge } from "@/components/ui/badge";

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

  return (
    <PageShell title="Newsletter" subtitle="Ordo Brief — drafts, review, publish, export.">
      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="type-title">Issues</h2>
          <Button intent="secondary" onClick={() => void load()} disabled={pending}>
            Refresh
          </Button>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="issue-title">Title</Label>
            <Input id="issue-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="issue-date">Issue date</Label>
            <Input id="issue-date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} placeholder="YYYY-MM-DD" />
          </div>
        </div>

        <Button intent="primary" className="mt-3" onClick={() => void onCreate()} disabled={creating}>
          {creating ? "Creating…" : "Create issue"}
        </Button>

        {problem ? (
          <div className="mt-4">
            <ProblemDetailsPanel problem={problem} />
          </div>
        ) : null}

        {pending ? <p className="mt-4 type-meta text-text-muted">Loading…</p> : null}

        {!pending && !problem ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm" aria-label="Newsletter issues table">
              <thead>
                <tr>
                  <th scope="col" className="pb-2">Issue</th>
                  <th scope="col" className="pb-2">Date</th>
                  <th scope="col" className="pb-2">Status</th>
                  <th scope="col" className="pb-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-3 type-meta text-text-muted">
                      No issues yet.
                    </td>
                  </tr>
                ) : null}

                {items.map((item) => (
                  <tr key={item.id} className="border-t border-border-default">
                    <td className="py-2 pr-3">
                      <p className="type-label text-text-primary">{item.title}</p>
                      <p className="type-meta text-text-muted">{item.id}</p>
                    </td>
                    <td className="py-2 pr-3">
                      <span className="type-meta text-text-secondary">{item.issue_date}</span>
                    </td>
                    <td className="py-2 pr-3">
                      <Badge variant={statusVariant(item.status)}>{item.status}</Badge>
                    </td>
                    <td className="py-2">
                      <Link href={`/admin/newsletter/${item.id}`} className="type-label underline">
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </Card>
    </PageShell>
  );
}
