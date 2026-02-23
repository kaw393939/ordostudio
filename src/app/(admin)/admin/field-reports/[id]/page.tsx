"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import { PageShell } from "@/components/layout/page-shell";
import { Button, Card } from "@/components/primitives";
import { Badge } from "@/components/ui/badge";
import { ProblemDetailsPanel } from "@/components/problem-details";
import { requestHal, type ProblemDetails } from "@/lib/hal-client";
import { RelativeTime } from "@/components/forms/relative-time";

type FieldReportDetail = {
  id: string;
  event_slug: string;
  event_title: string;
  user_email: string;
  key_insights: string;
  models: string;
  money: string;
  people: string;
  what_i_tried: string;
  client_advice: string;
  summary: string | null;
  featured: 0 | 1;
  created_at: string;
  updated_at: string;
};

export default function AdminFieldReportDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [report, setReport] = useState<FieldReportDetail | null>(null);
  const [pending, setPending] = useState(true);
  const [problem, setProblem] = useState<ProblemDetails | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setPending(true);
    const result = await requestHal<FieldReportDetail>(`/api/v1/admin/field-reports/${id}`);
    if (!result.ok) {
      setProblem(result.problem);
      setReport(null);
      setPending(false);
      return;
    }

    setProblem(null);
    setReport(result.data);
    setPending(false);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const setFeatured = async (next: boolean) => {
    setSaving(true);
    setProblem(null);

    const result = await requestHal<FieldReportDetail>(`/api/v1/admin/field-reports/${id}/feature`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ featured: next }),
    });

    if (!result.ok) {
      setProblem(result.problem);
      setSaving(false);
      return;
    }

    setReport(result.data);
    setSaving(false);
  };

  return (
    <PageShell title="Field report" subtitle="Review structured notes and mark featured.">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/admin/field-reports" className="type-label underline">
            Back to list
          </Link>
          <Link href="/api/v1/admin/field-reports/export" className="type-label underline">
            Export CSV
          </Link>
        </div>
        <Button intent="secondary" onClick={() => void load()} disabled={pending}>
          Refresh
        </Button>
      </div>

      {pending ? <p className="mt-3 type-meta text-text-muted">Loading…</p> : null}

      {problem ? (
        <div className="mt-4">
          <ProblemDetailsPanel problem={problem} />
        </div>
      ) : null}

      {report ? (
        <Card className="mt-4 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="type-title text-text-primary">{report.event_title}</h2>
              <p className="mt-1 type-meta text-text-muted">{report.event_slug}</p>
              <p className="mt-2 type-meta text-text-secondary">Submitter: {report.user_email}</p>
              <p className="type-meta text-text-secondary">
                Submitted <RelativeTime iso={report.created_at} />
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {report.featured === 1 ? <Badge variant="secondary">Featured</Badge> : <Badge variant="outline">New</Badge>}
              <Button
                intent="primary"
                onClick={() => void setFeatured(report.featured !== 1)}
                disabled={saving}
              >
                {saving ? "Saving…" : report.featured === 1 ? "Unfeature" : "Mark featured"}
              </Button>
            </div>
          </div>

          {report.summary ? (
            <div className="mt-4">
              <p className="type-label text-text-primary">Summary</p>
              <p className="mt-1 whitespace-pre-wrap type-body-sm text-text-secondary">{report.summary}</p>
            </div>
          ) : null}

          <div className="mt-4 grid gap-4">
            <div>
              <p className="type-label text-text-primary">Key insights</p>
              <p className="mt-1 whitespace-pre-wrap type-body-sm text-text-secondary">{report.key_insights}</p>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <p className="type-label text-text-primary">Models</p>
                <p className="mt-1 whitespace-pre-wrap type-body-sm text-text-secondary">{report.models}</p>
              </div>
              <div>
                <p className="type-label text-text-primary">Money</p>
                <p className="mt-1 whitespace-pre-wrap type-body-sm text-text-secondary">{report.money}</p>
              </div>
              <div>
                <p className="type-label text-text-primary">People</p>
                <p className="mt-1 whitespace-pre-wrap type-body-sm text-text-secondary">{report.people}</p>
              </div>
            </div>

            <div>
              <p className="type-label text-text-primary">What I tried</p>
              <p className="mt-1 whitespace-pre-wrap type-body-sm text-text-secondary">{report.what_i_tried}</p>
            </div>

            <div>
              <p className="type-label text-text-primary">What I’d advise a client</p>
              <p className="mt-1 whitespace-pre-wrap type-body-sm text-text-secondary">{report.client_advice}</p>
            </div>
          </div>
        </Card>
      ) : null}
    </PageShell>
  );
}
