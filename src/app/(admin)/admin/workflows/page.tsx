"use client";

/**
 * /admin/workflows — Workflow Rules list with enable/disable toggles
 */

import { useEffect, useState } from "react";
import Link from "next/link";

interface WorkflowRule {
  id: string;
  name: string;
  description: string | null;
  trigger_event: string;
  action_type: string;
  enabled: number;
  position: number;
}

const ACTION_LABELS: Record<string, string> = {
  UPDATE_CONTACT_STATUS: "Update status",
  ASSIGN_TO_STAFF: "Assign to staff",
  SEND_EMAIL: "Send email",
  CREATE_FEED_EVENT: "Create event",
};

export default function WorkflowRulesPage() {
  const [rules, setRules] = useState<WorkflowRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/v1/admin/workflows");
        if (res.ok) {
          const data = (await res.json()) as { rules: WorkflowRule[] };
          setRules(data.rules);
        } else {
          setError(`Failed to load rules (${res.status})`);
        }
      } catch {
        setError("Network error");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleToggle(rule: WorkflowRule) {
    setToggling(rule.id);
    try {
      const res = await fetch(`/api/v1/admin/workflows/${rule.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: rule.enabled ? 0 : 1 }),
      });
      if (res.ok) {
        const updated = (await res.json()) as WorkflowRule;
        setRules((prev) => prev.map((r) => (r.id === rule.id ? updated : r)));
      }
    } finally {
      setToggling(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this workflow rule?")) return;
    const res = await fetch(`/api/v1/admin/workflows/${id}`, { method: "DELETE" });
    if (res.ok || res.status === 204) {
      setRules((prev) => prev.filter((r) => r.id !== id));
    }
  }

  return (
    <main id="main-content" className="container-grid py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="type-title text-text-primary">Workflow Rules</h1>
          <p className="type-body-sm text-text-secondary mt-1">
            Automate actions triggered by platform events.
          </p>
        </div>
        <Link
          href="/admin/workflows/new"
          className="type-label bg-brand text-text-inverse px-3 py-1.5 rounded hover:opacity-90"
        >
          + New Rule
        </Link>
      </div>

      {error && <p className="type-body-sm text-text-error mb-4">{error}</p>}

      {loading ? (
        <p className="type-body-sm text-text-secondary">Loading…</p>
      ) : rules.length === 0 ? (
        <p className="type-body-sm text-text-muted">No workflow rules configured.</p>
      ) : (
        <div className="border border-border rounded overflow-hidden">
          <table className="w-full">
            <thead className="bg-bg-subtle">
              <tr>
                <th className="type-label text-text-secondary px-4 py-2 text-left">Name</th>
                <th className="type-label text-text-secondary px-4 py-2 text-left hidden sm:table-cell">Trigger</th>
                <th className="type-label text-text-secondary px-4 py-2 text-left hidden md:table-cell">Action</th>
                <th className="type-label text-text-secondary px-4 py-2 text-center">Enabled</th>
                <th className="type-label text-text-secondary px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rules.map((rule) => (
                <tr key={rule.id} className="bg-bg-surface hover:bg-bg-subtle transition-colors">
                  <td className="px-4 py-3">
                    <p className="type-label text-text-primary">{rule.name}</p>
                    {rule.description && (
                      <p className="type-meta text-text-muted">{rule.description}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className="type-meta text-text-secondary font-mono">{rule.trigger_event}</span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="type-meta text-text-secondary">
                      {ACTION_LABELS[rule.action_type] ?? rule.action_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      disabled={toggling === rule.id}
                      onClick={() => void handleToggle(rule)}
                      aria-label={rule.enabled ? "Disable rule" : "Enable rule"}
                      className={`w-10 h-5 rounded-full transition-colors disabled:opacity-50 ${
                        rule.enabled ? "bg-brand" : "bg-border"
                      }`}
                    >
                      <span
                        className={`block w-4 h-4 bg-white rounded-full shadow transition-transform mx-0.5 ${
                          rule.enabled ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/admin/workflows/${rule.id}/edit`}
                        className="type-meta text-brand hover:underline"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => void handleDelete(rule.id)}
                        className="type-meta text-text-error hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4">
        <Link
          href="/admin/workflows/executions"
          className="type-meta text-brand hover:underline"
        >
          View execution log →
        </Link>
      </div>
    </main>
  );
}
