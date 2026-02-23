import { Card } from "@/components/primitives";
import { PageShell } from "@/components/layout/page-shell";

export const metadata = {
  title: "Admin • Settings",
};

export default function AdminSettingsPage() {
  return (
    <PageShell
      title="Settings"
      subtitle="Environment and admin preferences."
      breadcrumbs={[
        { label: "Admin", href: "/admin" },
        { label: "Settings" },
      ]}
    >
      <Card className="p-4">
        <p className="type-body-sm text-text-secondary">No settings are configurable yet.</p>
      </Card>
    </PageShell>
  );
}
