"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Breadcrumbs } from "@/components/patterns";
import { Button, Card } from "@/components/primitives";
import { ProblemDetailsPanel } from "@/components/problem-details";
import { nowISO } from "@/lib/date-time";
import {
  canIncludeEmailExport,
  exportGovernanceCopy,
  exportPreview,
} from "@/lib/admin-operations-ui";
import { buildExportFileName } from "@/lib/admin-registration-view";
import { requestHal, type ProblemDetails } from "@/lib/hal-client";

type ExportReceipt = {
  fileName: string;
  generatedAt: string;
  format: "json" | "csv";
  includeEmail: boolean;
  byteCount: number;
  rowEstimate: number | null;
  generatedBy: string | null;
};

type MeResponse = {
  email: string;
};

const parseProblem = async (response: Response): Promise<ProblemDetails> => {
  try {
    return (await response.json()) as ProblemDetails;
  } catch {
    return {
      type: "about:blank",
      title: "Request Failed",
      status: response.status,
      detail: "Failed to parse problem details response.",
    };
  }
};

export default function AdminEventExportPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const [format, setFormat] = useState<"json" | "csv">("json");
  const [includeEmail, setIncludeEmail] = useState(false);
  const [pending, setPending] = useState(false);
  const [problem, setProblem] = useState<ProblemDetails | null>(null);
  const [lastReceipt, setLastReceipt] = useState<ExportReceipt | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [actorEmail, setActorEmail] = useState<string | null>(null);

  const hostname = typeof window === "undefined" ? "localhost" : window.location.hostname;
  const canIncludeEmail = canIncludeEmailExport(hostname);

  useEffect(() => {
    let mounted = true;

    const loadActor = async () => {
      const response = await requestHal<MeResponse>("/api/v1/me");
      if (!mounted || !response.ok) {
        return;
      }
      setActorEmail(response.data.email);
    };

    void loadActor();

    return () => {
      mounted = false;
    };
  }, []);

  const onExport = async () => {
    if (!slug) {
      return;
    }

    setPending(true);
    setProblem(null);

    const query = new URLSearchParams({
      format,
      include_email: includeEmail ? "true" : "false",
    }).toString();

    const response = await fetch(`/api/v1/events/${slug}/export?${query}`, {
      credentials: "include",
      headers: {
        accept: "application/json, text/csv, application/problem+json",
      },
    });

    if (!response.ok) {
      const parsed = await parseProblem(response);
      setProblem(
        includeEmail && parsed.status === 403
          ? {
              ...parsed,
              detail: `${parsed.detail} Next step: disable include-email export or use approved local workflow.`,
            }
          : parsed,
      );
      setPending(false);
      return;
    }

    const fileName = buildExportFileName(slug, format);
    const blob = await response.blob();
    const previewText = await blob.text();
    const url = URL.createObjectURL(blob);

    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(url);

    setPreview(exportPreview(format, previewText));

    let rowEstimate: number | null = null;
    if (format === "csv") {
      const lines = previewText.split("\n").filter((line) => line.trim().length > 0);
      rowEstimate = Math.max(lines.length - 1, 0);
    } else {
      try {
        const parsed = JSON.parse(previewText) as unknown;
        rowEstimate = Array.isArray(parsed) ? parsed.length : null;
      } catch {
        rowEstimate = null;
      }
    }

    setLastReceipt({
      fileName,
      generatedAt: nowISO(),
      format,
      includeEmail,
      byteCount: blob.size,
      rowEstimate,
      generatedBy: actorEmail,
    });
    setPending(false);
  };

  return (
    <main id="main-content" tabIndex={-1} className="container-grid py-6">
      <Breadcrumbs
        items={[
          { label: "Admin", href: "/admin" },
          { label: "Events", href: "/admin/events" },
          { label: slug ?? "Event", href: `/admin/events/${slug}` },
          { label: "Export" },
        ]}
      />
      <h1 className="type-h2">Event Export</h1>
      <p className="type-body-sm text-text-secondary">Event slug: {slug}</p>

      <Card className="mt-4 p-4">
        <h2 className="type-title">Export options</h2>
        <p className="mt-2 type-body-sm text-text-secondary">{exportGovernanceCopy(hostname)}</p>

        {includeEmail ? (
          <div className="mt-3 rounded-sm border border-state-danger bg-surface p-3">
            <p className="type-label text-state-danger">Sensitive export enabled</p>
            <p className="mt-1 type-meta text-text-secondary">
              This export may include personal email data. Confirm business need and approved handling before sharing.
            </p>
          </div>
        ) : (
          <div className="mt-3 rounded-sm border border-border-default bg-surface p-3">
            <p className="type-label text-text-secondary">Standard export mode</p>
            <p className="mt-1 type-meta text-text-muted">Email fields are excluded from output.</p>
          </div>
        )}

        <div className="mt-3 space-y-3">
          <label className="block type-label text-text-secondary">
            Format
            <select
              value={format}
              onChange={(event) => setFormat(event.target.value as "json" | "csv")}
              className="mt-1 w-full rounded-sm border border-border-default bg-surface px-3 py-2 type-body-sm"
            >
              <option value="json">JSON</option>
              <option value="csv">CSV</option>
            </select>
          </label>

          <label className="flex items-center gap-2 type-body-sm">
            <input
              type="checkbox"
              checked={includeEmail}
              onChange={(event) => setIncludeEmail(event.target.checked)}
              disabled={!canIncludeEmail}
            />
            Include email (subject to environment governance restrictions)
          </label>
          {!canIncludeEmail ? (
            <p className="type-meta text-text-muted">
              Include-email export is unavailable in this environment. Export without email, or move to approved local environment.
            </p>
          ) : null}

          <Button
            type="button"
            onClick={() => void onExport()}
            disabled={pending}
            intent="primary"
          >
            {pending ? "Exporting..." : "Export"}
          </Button>
        </div>
      </Card>

      {lastReceipt ? (
        <Card className="mt-4 p-4">
          <h2 className="type-title">Export receipt</h2>
          <dl className="mt-3 grid gap-2 type-body-sm md:grid-cols-2">
            <div>
              <dt className="type-meta text-text-muted">File</dt>
              <dd>{lastReceipt.fileName}</dd>
            </div>
            <div>
              <dt className="type-meta text-text-muted">Generated at</dt>
              <dd>{lastReceipt.generatedAt}</dd>
            </div>
            <div>
              <dt className="type-meta text-text-muted">Format</dt>
              <dd>{lastReceipt.format.toUpperCase()}</dd>
            </div>
            <div>
              <dt className="type-meta text-text-muted">Contains email</dt>
              <dd>{lastReceipt.includeEmail ? "Yes" : "No"}</dd>
            </div>
            <div>
              <dt className="type-meta text-text-muted">Size (bytes)</dt>
              <dd>{lastReceipt.byteCount}</dd>
            </div>
            <div>
              <dt className="type-meta text-text-muted">Rows</dt>
              <dd>{lastReceipt.rowEstimate ?? "Unknown"}</dd>
            </div>
            <div>
              <dt className="type-meta text-text-muted">Generated by</dt>
              <dd>{lastReceipt.generatedBy ?? "Unknown"}</dd>
            </div>
          </dl>
        </Card>
      ) : null}

      {preview ? (
        <Card className="mt-4 p-4">
          <h2 className="type-title">Output preview</h2>
          <pre className="mt-2 overflow-x-auto rounded-sm border border-border-default p-3 type-meta text-text-muted">{preview}</pre>
        </Card>
      ) : null}

      {problem ? (
        <div className="mt-4">
          <ProblemDetailsPanel problem={problem} />
        </div>
      ) : null}
    </main>
  );
}
