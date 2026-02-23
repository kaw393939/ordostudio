"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { PageShell } from "@/components/layout/page-shell";
import { Button, Card } from "@/components/primitives";
import { Badge } from "@/components/ui/badge";
import { ProblemDetailsPanel } from "@/components/problem-details";
import { requestHal, type ProblemDetails } from "@/lib/hal-client";
import { RelativeTime } from "@/components/forms/relative-time";

type FieldReportListItem = {
  id: string;
  event_slug: string;
  event_title: string;
  user_email: string;
  summary: string | null;
  featured: 0 | 1;
  created_at: string;
};

type FieldReportsResponse = {
  count: number;
  items: FieldReportListItem[];
  _links?: Record<string, { href: string }>;
};

export default function AdminFieldReportsPage() {
  const [items, setItems] = useState<FieldReportListItem[]>([]);
  const [pending, setPending] = useState(true);
  const [problem, setProblem] = useState<ProblemDetails | null>(null);
  const [focusedId, setFocusedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setPending(true);
    const result = await requestHal<FieldReportsResponse>("/api/v1/admin/field-reports");
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

  const focused = useMemo(() => {
    if (!focusedId) return null;
    return items.find((row) => row.id === focusedId) ?? null;
  }, [focusedId, items]);

  return (
    <PageShell
      title="Field reports"
      subtitle="Review submissions and choose what to feature."
      breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Field reports" }]}
    >
      <Card className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="type-title">Work queue</h2>
            <p className="mt-1 type-meta text-text-muted">Step 1: pick a submission. Step 2: open and review.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button intent="secondary" onClick={() => void load()} disabled={pending}>
              Refresh
            </Button>
            <a href="/api/v1/admin/field-reports/export" className="type-label underline" target="_blank" rel="noreferrer">
              Export CSV
            </a>
          </div>
        </div>
      </Card>

      {pending ? <p className="mt-4 type-meta text-text-muted">Loading…</p> : null}

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
              <p className="mt-1 type-meta text-text-muted">Submissions ({items.length})</p>
            </div>
            <Badge variant="outline">{items.length}</Badge>
          </div>

          {items.length === 0 && !pending && !problem ? (
            <p className="mt-3 type-meta text-text-muted">No submissions yet.</p>
          ) : null}

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
                      <p className="type-label text-text-primary line-clamp-1">{item.event_title}</p>
                      {item.featured === 1 ? <Badge variant="secondary">Featured</Badge> : <Badge variant="outline">New</Badge>}
                    </div>
                    <p className="mt-1 type-meta text-text-muted">{item.user_email}</p>
                    <p className="mt-1 type-meta text-text-muted">
                      <RelativeTime iso={item.created_at} className="type-meta text-text-muted" /> · {item.event_slug}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </Card>

        <Card className="p-4">
          <h2 className="type-title">Report</h2>

          {focused ? (
            <div className="mt-3 space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="type-label text-text-primary">{focused.event_title}</p>
                  <p className="mt-1 type-meta text-text-muted">{focused.user_email}</p>
                </div>
                <Link href={`/admin/field-reports/${focused.id}`} className="type-label underline">
                  Open
                </Link>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="surface rounded-sm border border-border-default p-3">
                  <p className="type-meta text-text-muted">Submitted</p>
                  <p className="type-label text-text-primary">
                    <RelativeTime iso={focused.created_at} />
                  </p>
                  <p className="mt-2 type-meta text-text-muted">Event</p>
                  <p className="type-label text-text-primary">{focused.event_slug}</p>
                </div>
                <div className="surface rounded-sm border border-border-default p-3">
                  <p className="type-meta text-text-muted">Status</p>
                  <div className="mt-2">{focused.featured === 1 ? <Badge variant="secondary">Featured</Badge> : <Badge variant="outline">New</Badge>}</div>
                  <p className="mt-3 type-meta text-text-muted">Summary</p>
                  <p className="type-body-sm text-text-secondary whitespace-pre-wrap">{focused.summary ?? "—"}</p>
                </div>
              </div>
            </div>
          ) : (
            <p className="mt-3 type-body-sm text-text-secondary">Step 2: choose a submission from the queue.</p>
          )}
        </Card>
      </div>
    </PageShell>
  );
}
