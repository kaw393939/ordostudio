"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

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
    setPending(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  return (
    <PageShell title="Field reports" subtitle="Studio apprenticeship submissions — review, feature, export.">
      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="type-title">Submissions</h2>
          <div className="flex flex-wrap items-center gap-2">
            <Button intent="secondary" onClick={() => void load()} disabled={pending}>
              Refresh
            </Button>
            <Link
              href="/api/v1/admin/field-reports/export"
              className="motion-base rounded-sm border border-border-default bg-surface px-3 py-2 type-label text-text-primary hover:bg-surface-2"
            >
              Export CSV
            </Link>
          </div>
        </div>

        {pending ? <p className="mt-3 type-meta text-text-muted">Loading…</p> : null}

        {problem ? (
          <div className="mt-4">
            <ProblemDetailsPanel problem={problem} />
          </div>
        ) : null}

        {!pending && !problem ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm" aria-label="Field reports table">
              <thead>
                <tr>
                  <th scope="col" className="pb-2">Event</th>
                  <th scope="col" className="pb-2">Submitter</th>
                  <th scope="col" className="pb-2">Submitted</th>
                  <th scope="col" className="pb-2">Summary</th>
                  <th scope="col" className="pb-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-3 type-meta text-text-muted">
                      No submissions yet.
                    </td>
                  </tr>
                ) : null}

                {items.map((item) => (
                  <tr key={item.id} className="border-t border-border-default">
                    <td className="py-2 pr-3">
                      <Link href={`/admin/field-reports/${item.id}`} className="type-label underline">
                        {item.event_title}
                      </Link>
                      <p className="type-meta text-text-muted">{item.event_slug}</p>
                    </td>
                    <td className="py-2 pr-3">
                      <span className="type-meta text-text-secondary">{item.user_email}</span>
                    </td>
                    <td className="py-2 pr-3">
                      <RelativeTime iso={item.created_at} className="type-meta text-text-secondary" />
                    </td>
                    <td className="py-2 pr-3">
                      <span className="type-meta text-text-secondary">{item.summary ?? "-"}</span>
                    </td>
                    <td className="py-2">
                      {item.featured === 1 ? <Badge variant="secondary">Featured</Badge> : <Badge variant="outline">New</Badge>}
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
