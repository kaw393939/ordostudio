import { Card } from "@/components/primitives";
import { PageShell } from "@/components/layout/page-shell";
import { getMenuContext } from "@/lib/navigation/menu-audience";
import { hasRequiredRole, roleAccessProblem } from "@/lib/ui-access";
import { ProblemDetailsPanel } from "@/components/problem-details";

export const metadata = {
  title: "Admin • Agent Ops",
};

export default async function AdminAgentOpsPage() {
  const context = await getMenuContext();

  if (!hasRequiredRole(context.roles, ["SUPER_ADMIN"])) {
    return (
      <main id="main-content" tabIndex={-1} className="mx-auto max-w-4xl p-6" role="alert">
        <ProblemDetailsPanel problem={roleAccessProblem(["SUPER_ADMIN"])} />
      </main>
    );
  }

  return (
    <PageShell
      title="Agent Ops"
      subtitle="AI agent monitoring and operational triage."
      breadcrumbs={[
        { label: "Admin", href: "/admin" },
        { label: "Agent Ops" },
      ]}
    >
      <Card className="p-4">
        <p className="type-body-sm text-text-secondary">
          Agent operations triage is coming soon. This page will display agent run logs, failure rates, and escalation queues.
        </p>
      </Card>
    </PageShell>
  );
}
