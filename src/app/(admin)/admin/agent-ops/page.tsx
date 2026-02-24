import { Card } from "@/components/primitives";
import { PageShell } from "@/components/layout/page-shell";
import { getMenuContext } from "@/lib/navigation/menu-audience";
import { hasRequiredRole, roleAccessProblem } from "@/lib/ui-access";
import { ProblemDetailsPanel } from "@/components/problem-details";
import {
  TRIAGE_CATEGORIES,
  CATEGORY_LABELS,
  TRIAGE_PRIORITIES,
  type TriageCategory,
  type TriagePriority,
} from "@/lib/triage";

export const metadata = {
  title: "Admin • Agent Ops",
};

/* ── colour helpers ─────────────────────────────────── */

const PRIORITY_STYLES: Record<TriagePriority, string> = {
  urgent: "bg-red-100 text-red-800",
  high: "bg-orange-100 text-orange-800",
  medium: "bg-yellow-100 text-yellow-800",
  low: "bg-green-100 text-green-800",
};

const CONFIDENCE_COLOUR = (c: number): string => {
  if (c >= 0.8) return "text-state-success";
  if (c >= 0.6) return "text-state-warning";
  return "text-state-error";
};

/* ── page ───────────────────────────────────────────── */

export default async function AdminAgentOpsPage() {
  const context = await getMenuContext();

  if (!hasRequiredRole(context.roles, ["SUPER_ADMIN"])) {
    return (
      <main id="main-content" tabIndex={-1} className="mx-auto max-w-4xl p-6" role="alert">
        <ProblemDetailsPanel problem={roleAccessProblem(["SUPER_ADMIN"])} />
      </main>
    );
  }

  const hasOpenAIKey = !!process.env.API__OPENAI_API_KEY;

  return (
    <PageShell
      title="Agent Ops"
      subtitle="AI agent monitoring and operational triage."
      breadcrumbs={[
        { label: "Admin", href: "/admin" },
        { label: "Agent Ops" },
      ]}
    >
      {/* Overview cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <p className="type-meta text-text-muted">Triage Provider</p>
          <p className="type-title text-text-primary mt-1">
            {hasOpenAIKey ? "OpenAI GPT-4o-mini" : "Rule-Based (Stub)"}
          </p>
          <p className={`type-meta mt-1 ${hasOpenAIKey ? "text-state-success" : "text-state-warning"}`}>
            {hasOpenAIKey ? "Live" : "Set API__OPENAI_API_KEY to enable"}
          </p>
        </Card>
        <Card className="p-4">
          <p className="type-meta text-text-muted">Categories</p>
          <p className="type-title text-text-primary mt-1">{TRIAGE_CATEGORIES.length}</p>
          <p className="type-meta text-text-secondary mt-1">defined</p>
        </Card>
        <Card className="p-4">
          <p className="type-meta text-text-muted">Auto-Response</p>
          <p className="type-title text-text-primary mt-1">5 templates</p>
          <p className="type-meta text-state-success mt-1">Active</p>
        </Card>
        <Card className="p-4">
          <p className="type-meta text-text-muted">Feedback Loop</p>
          <p className="type-title text-text-primary mt-1">Admin Override</p>
          <p className="type-meta text-state-success mt-1">Enabled</p>
        </Card>
      </div>

      {/* Triage categories catalogue */}
      <Card className="mt-6 p-4">
        <h2 className="type-title text-text-primary">Triage Categories</h2>
        <p className="type-body-sm text-text-secondary mt-1">
          AI-assigned categories for incoming requests. Admins can override any classification.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border-subtle">
                <th className="px-3 py-2 type-label text-text-muted">Category</th>
                <th className="px-3 py-2 type-label text-text-muted">ID</th>
                <th className="px-3 py-2 type-label text-text-muted">Auto-Response</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {TRIAGE_CATEGORIES.map((cat) => (
                <tr key={cat}>
                  <td className="px-3 py-2 type-body-sm text-text-primary">
                    {CATEGORY_LABELS[cat]}
                  </td>
                  <td className="px-3 py-2 type-meta text-text-secondary font-mono">{cat}</td>
                  <td className="px-3 py-2 type-meta">
                    {cat === "urgent_escalation" || cat === "spam" ? (
                      <span className="text-text-muted">—</span>
                    ) : (
                      <span className="text-state-success">Yes</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Priority levels */}
      <Card className="mt-6 p-4">
        <h2 className="type-title text-text-primary">Priority Levels</h2>
        <p className="type-body-sm text-text-secondary mt-1">
          Priority is derived from category and AI confidence score.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {TRIAGE_PRIORITIES.map((p) => (
            <span
              key={p}
              className={`inline-flex items-center rounded-full px-3 py-1 type-label capitalize ${PRIORITY_STYLES[p]}`}
            >
              {p}
            </span>
          ))}
        </div>
      </Card>

      {/* System behaviour rules */}
      <Card className="mt-6 p-4">
        <h2 className="type-title text-text-primary">Triage Rules</h2>
        <p className="type-body-sm text-text-secondary mt-1">
          How the system routes requests based on AI results.
        </p>
        <ul className="mt-3 space-y-2">
          <li className="type-body-sm text-text-primary flex items-center gap-2">
            <span className="size-2 rounded-full bg-state-success" />
            High-confidence requests ({"\u2265"}70%) receive automated email response
          </li>
          <li className="type-body-sm text-text-primary flex items-center gap-2">
            <span className="size-2 rounded-full bg-state-warning" />
            Low-confidence requests (&lt;70%) are flagged for manual review
          </li>
          <li className="type-body-sm text-text-primary flex items-center gap-2">
            <span className="size-2 rounded-full bg-state-error" />
            Urgent escalations are never auto-responded — routed to humans immediately
          </li>
          <li className="type-body-sm text-text-primary flex items-center gap-2">
            <span className="size-2 rounded-full bg-text-muted" />
            Spam is silently discarded — no response, no escalation
          </li>
          <li className="type-body-sm text-text-primary flex items-center gap-2">
            <span className="size-2 rounded-full bg-action-primary" />
            Admin overrides are logged for future model fine-tuning
          </li>
        </ul>
      </Card>
    </PageShell>
  );
}
