import Link from "next/link";
import { EmptyState } from "@/components/patterns";
import { Card } from "@/components/primitives";
import { PageShell } from "@/components/layout/page-shell";

export const metadata = {
  title: "Admin • Registrations",
};

export default function AdminRegistrationsPage() {
  return (
    <PageShell
      title="Registrations"
      subtitle="Manage event registrations."
      breadcrumbs={[
        { label: "Admin", href: "/admin" },
        { label: "Registrations" },
      ]}
    >
      <Card className="p-4">
        <EmptyState
          title="No registrations list view yet"
          description="Registrations are managed from each event."
          action={
            <Link href="/admin/events" className="type-label underline">
              Go to events
            </Link>
          }
        />
      </Card>
    </PageShell>
  );
}
