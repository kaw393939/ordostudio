"use client";

/**
 * /admin/workflows/executions — Workflow execution audit log
 */

import { useEffect, useState } from "react";
import Link from "next/link";

interface ExecutionRow {
  id: string;
  rule_id: string;
  rule_name: string | null;
  feed_event_id: string;
  status: "SUCCESS" | "FAILED" | "SKIPPED";
  error: string | null;
  executed_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  SUCCESS: "text-text-success",
  FAILED: "text-text-error",
  SKIPPED: "text-text-secondary",
};

export default function WorkflowExecutionsPage() {
  const [executions, setExecutions] = useState<ExecutionRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const limit = 50;

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/v1/admin/workflows/executions?page=${page}&limit=${limit}`);
        if (res.ok) {
          const data = (await res.json()) as { executions: ExecutionRow[]; total: number };
          setExecutions(data.executions);
          setTotal(data.total);
        } else {
          setError(`Failed to load executions (${res.status})`);
        }
      } catch {
        setError("Network error");
      } finally {
        setLoading(false);
      }
    })();
  }, [page]);

  return (
    <main id="main-content" className="container-grid py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="type-title text-text-primary">Execution Log</h1>
          <p className="type-body-sm text-text-secondary mt-1">
            History of all workflow rule executions.
          </p>
        </div>
        <Link
          href="/admin/workflows"
          className="type-meta text-brand hover:underline"
        >
          ← Workflow Rules
        </Link>
      </div>

      {error && <p className="type-body-sm text-text-error mb-4">{error}</p>}

      {loading ? (
        <p className="type-body-sm text-text-secondary">Loading…</p>
      ) : executions.length === 0 ? (
        <p className="type-body-sm text-text-muted">No executions recorded yet.</p>
      ) : (
        <>
          <div className="border border-border rounded overflow-hidden">
            <table className="w-full">
              <thead className="bg-bg-subtle">
                <tr>
                  <th className="type-label text-text-secondary px-4 py-2 text-left">Rule</th>
                  <th className="type-label text-text-secondary px-4 py-2 text-left hidden sm:table-cell">Event</th>
                  <th className="type-label text-text-secondary px-4 py-2 text-center">Status</th>
                  <th className="type-label text-text-secondary px-4 py-2 text-right">Executed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {executions.map((ex) => (
                  <tr key={ex.id} className="bg-bg-surface hover:bg-bg-subtle transition-colors">
                    <td className="px-4 py-3">
                      <p className="type-label text-text-primary">{ex.rule_name ?? ex.rule_id}</p>
                      {ex.error && (
                        <p className="type-meta text-text-error">{ex.error}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="type-meta text-text-muted font-mono truncate block max-w-[160px]">
                        {ex.feed_event_id}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`type-label ${STATUS_COLORS[ex.status] ?? ""}`}>
                        {ex.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="type-meta text-text-muted">
                        {new Date(ex.executed_at).toLocaleString()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between mt-4">
            <p className="type-meta text-text-muted">
              {total} total execution{total !== 1 ? "s" : ""}
            </p>
            <div className="flex gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="type-meta text-brand hover:underline disabled:opacity-40"
              >
                ← Prev
              </button>
              <span className="type-meta text-text-secondary">Page {page}</span>
              <button
                disabled={page * limit >= total}
                onClick={() => setPage((p) => p + 1)}
                className="type-meta text-brand hover:underline disabled:opacity-40"
              >
                Next →
              </button>
            </div>
          </div>
        </>
      )}
    </main>
  );
}
