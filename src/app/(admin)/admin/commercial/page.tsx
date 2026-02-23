import { PageShell } from "@/components/layout/page-shell";
import { EmptyState } from "@/components/patterns";
import { Card } from "@/components/primitives";

export default function AdminCommercialPage() {
  return (
    <PageShell
      title="Commercial"
      subtitle="Proposals, invoices, and payment tracking."
      breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Commercial" }]}
    >
      <Card className="p-4">
        <EmptyState
          title="Commercial tracking isn’t set up yet"
          description="This area will list proposals, invoices, and payments once enabled."
        />
      </Card>
    </PageShell>
  );
}
