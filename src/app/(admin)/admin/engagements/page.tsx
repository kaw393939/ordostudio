import Link from "next/link";
import { EmptyState } from "@/components/patterns";
import { Card } from "@/components/primitives";
import { PageShell } from "@/components/layout/page-shell";

export const metadata = {
  title: "Admin • Engagements",
};

export default function AdminEngagementsPage() {
  return (
    <PageShell
      title="Engagements"
      subtitle="Follow-up, outcomes, and engagement reporting."
      breadcrumbs={[
        { label: "Admin", href: "/admin" },
        { label: "Engagements" },
      ]}
    >
      <Card className="p-4">
        <EmptyState
          title="No engagements dashboard yet"
          description="Engagement follow-ups are currently managed from individual events."
          action={
            <Link href="/admin/events" className="type-label underline">
              Browse events
            </Link>
          }
        />
      </Card>
    </PageShell>
  );
}
