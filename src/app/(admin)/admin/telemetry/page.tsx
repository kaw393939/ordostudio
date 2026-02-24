import { Card } from "@/components/primitives";
import { PageShell } from "@/components/layout/page-shell";
import { getMenuContext } from "@/lib/navigation/menu-audience";
import { hasRequiredRole, roleAccessProblem } from "@/lib/ui-access";
import { ProblemDetailsPanel } from "@/components/problem-details";
import { ANALYTICS_EVENTS } from "@/lib/analytics-events";

export const metadata = {
  title: "Admin • Telemetry",
};

export default async function AdminTelemetryPage() {
  const context = await getMenuContext();

  if (!hasRequiredRole(context.roles, ["SUPER_ADMIN"])) {
    return (
      <main id="main-content" tabIndex={-1} className="mx-auto max-w-4xl p-6" role="alert">
        <ProblemDetailsPanel problem={roleAccessProblem(["SUPER_ADMIN"])} />
      </main>
    );
  }

  const eventNames = Object.values(ANALYTICS_EVENTS);

  return (
    <PageShell
      title="Telemetry"
      subtitle="Real-time platform metrics and observability."
      breadcrumbs={[
        { label: "Admin", href: "/admin" },
        { label: "Telemetry" },
      ]}
    >
      {/* Overview cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <p className="type-meta text-text-muted">Analytics Provider</p>
          <p className="type-title text-text-primary mt-1">PostHog (Stub)</p>
          <p className="type-meta text-state-warning mt-1">Awaiting NEXT_PUBLIC_POSTHOG_KEY</p>
        </Card>
        <Card className="p-4">
          <p className="type-meta text-text-muted">Privacy Mode</p>
          <p className="type-title text-text-primary mt-1">DNT + Opt-Out</p>
          <p className="type-meta text-state-success mt-1">Active</p>
        </Card>
        <Card className="p-4">
          <p className="type-meta text-text-muted">Custom Events</p>
          <p className="type-title text-text-primary mt-1">{eventNames.length}</p>
          <p className="type-meta text-text-secondary mt-1">defined</p>
        </Card>
        <Card className="p-4">
          <p className="type-meta text-text-muted">Data Sanitisation</p>
          <p className="type-title text-text-primary mt-1">PII Redaction</p>
          <p className="type-meta text-state-success mt-1">Enabled</p>
        </Card>
      </div>

      {/* Tracked events catalogue */}
      <Card className="mt-6 p-4">
        <h2 className="type-title text-text-primary">Tracked Events Catalogue</h2>
        <p className="type-body-sm text-text-secondary mt-1">
          Custom analytics events defined across the platform.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border-subtle">
                <th className="px-3 py-2 type-label text-text-muted">Event Name</th>
                <th className="px-3 py-2 type-label text-text-muted">Category</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {eventNames.map((name) => (
                <tr key={name}>
                  <td className="px-3 py-2 type-meta text-text-primary font-mono">{name}</td>
                  <td className="px-3 py-2 type-meta text-text-secondary">
                    {name.split("_")[0]}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Privacy controls */}
      <Card className="mt-6 p-4">
        <h2 className="type-title text-text-primary">Privacy Controls</h2>
        <p className="type-body-sm text-text-secondary mt-1">
          Data protection measures active on the platform.
        </p>
        <ul className="mt-3 space-y-2">
          <li className="type-body-sm text-text-primary flex items-center gap-2">
            <span className="size-2 rounded-full bg-state-success" />
            Do Not Track (DNT) header respected
          </li>
          <li className="type-body-sm text-text-primary flex items-center gap-2">
            <span className="size-2 rounded-full bg-state-success" />
            Cookie-based opt-out via <code className="type-meta">so_tracking_optout</code>
          </li>
          <li className="type-body-sm text-text-primary flex items-center gap-2">
            <span className="size-2 rounded-full bg-state-success" />
            PII sanitisation: emails redacted, sensitive keys stripped
          </li>
          <li className="type-body-sm text-text-primary flex items-center gap-2">
            <span className="size-2 rounded-full bg-state-success" />
            No session recording until explicit PostHog opt-in
          </li>
        </ul>
      </Card>
    </PageShell>
  );
}
