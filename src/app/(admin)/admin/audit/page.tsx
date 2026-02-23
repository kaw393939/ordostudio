"use client";

import { useMemo, useState } from "react";
import { FileDown, Pencil, Shield, Trash2, UserPlus } from "lucide-react";
import { Button, Card } from "@/components/primitives";
import { DateRangePicker, type DateRangeValue } from "@/components/forms";
import { RelativeTime } from "@/components/forms/relative-time";
import { PageShell } from "@/components/layout/page-shell";
import { EmptyState } from "@/components/patterns";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ProblemDetailsPanel } from "@/components/problem-details";
import {
  auditSeverityForAction,
  summarizeAuditMetadata,
  validateAuditDateRange,
} from "@/lib/admin-operations-ui";
import { requestHal, type ProblemDetails } from "@/lib/hal-client";

type AuditItem = {
  id: string;
  action: string;
  actor_id: string | null;
  created_at: string;
  metadata: Record<string, unknown> | null;
  request_id: string;
};

type AuditResponse = {
  count: number;
  limit?: number;
  offset?: number;
  items: AuditItem[];
};

const escapeHtml = (input: string): string => {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
};

const toHighlightedJsonHtml = (value: unknown): string => {
  const json = escapeHtml(JSON.stringify(value ?? {}, null, 2));
  return json.replace(
    /("(\\u[a-fA-F0-9]{4}|\\[^u]|[^\\"])*"\s*:)|("(\\u[a-fA-F0-9]{4}|\\[^u]|[^\\"])*")|\b(true|false|null)\b|\b-?\d+(?:\.\d+)?\b/g,
    (match) => {
      if (match.startsWith('"') && match.endsWith(':')) {
        return `<span class="text-text-primary">${match}</span>`;
      }
      if (match.startsWith('"')) {
        return `<span class="text-text-secondary">${match}</span>`;
      }
      if (match === "true" || match === "false" || match === "null") {
        return `<span class="text-text-muted">${match}</span>`;
      }
      return `<span class="text-text-secondary">${match}</span>`;
    },
  );
};

const toActionIcon = (action: string) => {
  const normalized = action.trim().toLowerCase();
  if (normalized.includes("user.create") || normalized.includes("account.create")) {
    return UserPlus;
  }
  if (normalized.includes("update") || normalized.includes("edit")) {
    return Pencil;
  }
  if (normalized.includes("delete") || normalized.includes("remove")) {
    return Trash2;
  }
  if (normalized.includes("auth") || normalized.includes("token") || normalized.includes("role")) {
    return Shield;
  }
  return Shield;
};

const toCsv = (rows: AuditItem[]): string => {
  const escape = (value: string) => {
    const normalized = value.replaceAll("\r\n", "\n").replaceAll("\r", "\n");
    return `"${normalized.replaceAll("\"", "\"\"")}"`;
  };

  const header = ["created_at", "action", "severity", "actor_id", "request_id", "metadata"].join(",");
  const lines = rows.map((row) => {
    const severity = auditSeverityForAction(row.action);
    return [
      escape(row.created_at),
      escape(row.action),
      escape(severity),
      escape(row.actor_id ?? ""),
      escape(row.request_id),
      escape(JSON.stringify(row.metadata ?? {})),
    ].join(",");
  });

  return [header, ...lines].join("\n");
};

export default function AdminAuditPage() {
  const [action, setAction] = useState("");
  const [actorId, setActorId] = useState("");
  const [dateRange, setDateRange] = useState<DateRangeValue>({ from: "", to: "" });
  const [items, setItems] = useState<AuditItem[]>([]);
  const [pending, setPending] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [problem, setProblem] = useState<ProblemDetails | null>(null);
  const [copiedRequestId, setCopiedRequestId] = useState<string | null>(null);

  const severityClasses: Record<ReturnType<typeof auditSeverityForAction>, string> = {
    critical: "border-state-danger text-state-danger",
    high: "border-state-warning text-state-warning",
    medium: "border-border-strong text-text-primary",
    low: "border-border-default text-text-secondary",
  };

  const load = async (opts?: { limit?: number }) => {
    const dateValidation = validateAuditDateRange(dateRange.from, dateRange.to);
    if (!dateValidation.valid) {
      setProblem({
        type: "about:blank",
        title: "Invalid Date Range",
        status: 400,
        detail: dateValidation.message,
      });
      return;
    }

    setPending(true);
    setProblem(null);

    const params = new URLSearchParams({ limit: String(opts?.limit ?? 50), offset: "0" });
    if (action.trim().length > 0) {
      params.set("action", action.trim());
    }
    if (actorId.trim().length > 0) {
      params.set("actor_id", actorId.trim());
    }
    if (dateValidation.fromIso) {
      params.set("from", dateValidation.fromIso);
    }
    if (dateValidation.toIso) {
      params.set("to", dateValidation.toIso);
    }

    const result = await requestHal<AuditResponse>(`/api/v1/audit?${params.toString()}`);
    if (!result.ok) {
      setProblem(result.problem);
      setPending(false);
      return;
    }

    setProblem(null);
    setItems(result.data.items ?? []);
    setPending(false);
  };

  const filterSummary = useMemo(() => {
    const parts: string[] = [];
    if (action.trim().length > 0) parts.push(`Action: ${action.trim()}`);
    if (actorId.trim().length > 0) parts.push(`Actor: ${actorId.trim()}`);
    if (dateRange.from.trim().length > 0 || dateRange.to.trim().length > 0) {
      parts.push(`Range: ${dateRange.from || "—"} → ${dateRange.to || "—"}`);
    }
    return parts.length > 0 ? parts.join(" · ") : "No filters";
  }, [action, actorId, dateRange.from, dateRange.to]);

  const copyRequestId = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedRequestId(value);
      window.setTimeout(() => setCopiedRequestId(null), 1200);
    } catch {
      // Fallback: select via prompt.
      window.prompt("Copy request id", value);
    }
  };

  const onExportCsv = async () => {
    const dateValidation = validateAuditDateRange(dateRange.from, dateRange.to);
    if (!dateValidation.valid) {
      setProblem({
        type: "about:blank",
        title: "Invalid Date Range",
        status: 400,
        detail: dateValidation.message,
      });
      return;
    }

    setExporting(true);
    setProblem(null);

    const params = new URLSearchParams({ limit: "500", offset: "0" });
    if (action.trim().length > 0) {
      params.set("action", action.trim());
    }
    if (actorId.trim().length > 0) {
      params.set("actor_id", actorId.trim());
    }
    if (dateValidation.fromIso) {
      params.set("from", dateValidation.fromIso);
    }
    if (dateValidation.toIso) {
      params.set("to", dateValidation.toIso);
    }

    const result = await requestHal<AuditResponse>(`/api/v1/audit?${params.toString()}`);
    if (!result.ok) {
      setProblem(result.problem);
      setExporting(false);
      return;
    }

    const csv = toCsv(result.data.items ?? []);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `audit-export-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);

    setExporting(false);
  };

  return (
    <PageShell
      title="Audit Log"
      subtitle="Review administrative operations and security events."
      breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Audit Log" }]}
    >
      <Card className="p-4">
        <h2 className="type-title">Filters</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="audit-action">Action</Label>
            <Input
              id="audit-action"
              value={action}
              onChange={(event) => setAction(event.target.value)}
              placeholder="e.g., user.login"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="audit-actor">Actor ID</Label>
            <Input
              id="audit-actor"
              value={actorId}
              onChange={(event) => setActorId(event.target.value)}
              placeholder="e.g., usr_abc123"
            />
          </div>
          <DateRangePicker label="Date range" value={dateRange} onChange={setDateRange} presets />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button onClick={() => void load()} disabled={pending} intent="primary">
            {pending ? "Loading..." : "Load audit entries"}
          </Button>
          <Button onClick={() => void onExportCsv()} disabled={pending || exporting} intent="secondary">
            <FileDown className="mr-2 size-4" />
            {exporting ? "Exporting..." : "Export CSV"}
          </Button>
        </div>
      </Card>

      <div className="sticky top-32 z-10 mt-4 rounded-sm border border-border-default bg-surface px-3 py-2">
        <p className="type-meta text-text-muted">
          Active: <span className="text-text-secondary">{filterSummary}</span>
          <span className="ml-2">·</span>
          <span className="ml-2">Showing: {items.length}</span>
        </p>
      </div>

      {problem ? (
        <div className="mt-4">
          <ProblemDetailsPanel problem={problem} />
        </div>
      ) : null}

      <Card className="mt-4 p-4">
        <h2 className="type-title">Entries ({items.length})</h2>
        {items.length === 0 ? (
          <div className="mt-3">
            <EmptyState
              icon={<Shield className="size-5" />}
              title="No audit entries loaded"
              description="Apply filters and load the audit log to review administrative operations."
              action={
                <Button intent="primary" onClick={() => void load()} disabled={pending}>
                  {pending ? "Loading..." : "Load audit entries"}
                </Button>
              }
            />
          </div>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-180 text-left type-body-sm">
              <thead>
                <tr>
                  <th className="pb-2">When</th>
                  <th className="pb-2">Action</th>
                  <th className="pb-2">Severity</th>
                  <th className="pb-2">Actor</th>
                  <th className="pb-2">Request</th>
                  <th className="pb-2">Metadata</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const severity = auditSeverityForAction(item.action);
                  const ActionIcon = toActionIcon(item.action);

                  return (
                    <tr key={item.id} className="border-t align-top">
                      <td className="py-2 pr-3">
                        <RelativeTime iso={item.created_at} className="type-meta text-text-secondary" />
                      </td>
                      <td className="py-2 pr-3">
                        <div className="flex items-start gap-2">
                          <ActionIcon className="mt-0.5 size-4 text-text-muted" />
                          <span className="type-label text-text-primary">{item.action}</span>
                        </div>
                      </td>
                      <td className="py-2">
                        <span
                          className={`inline-flex rounded-sm border px-2 py-1 text-xs font-medium uppercase tracking-wide ${severityClasses[severity]}`}
                        >
                          {severity}
                        </span>
                      </td>
                      <td className="py-2 pr-3">
                        <span className="type-meta text-text-secondary">{item.actor_id ?? "-"}</span>
                      </td>
                      <td className="py-2 pr-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="type-meta text-text-secondary">{item.request_id}</span>
                          <Button
                            intent="secondary"
                            size="sm"
                            onClick={() => void copyRequestId(item.request_id)}
                            disabled={pending}
                          >
                            {copiedRequestId === item.request_id ? "Copied" : "Copy"}
                          </Button>
                        </div>
                      </td>
                      <td className="py-2">
                        <p className="type-meta text-text-secondary">{summarizeAuditMetadata(item.metadata)}</p>
                        <details className="mt-1">
                          <summary className="cursor-pointer type-meta text-text-muted">View details</summary>
                          <pre
                            className="mt-2 overflow-x-auto rounded-sm border border-border-default bg-surface p-3 text-xs"
                            dangerouslySetInnerHTML={{ __html: toHighlightedJsonHtml(item.metadata ?? {}) }}
                          />
                        </details>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </PageShell>
  );
}
