import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { Card } from "@/components/primitives";

export const metadata = {
  title: "Admin • Dashboard",
};

export default function AdminHomePage() {
  return (
    <PageShell
      title="Admin Dashboard"
      subtitle="Operations overview and shortcuts."
      breadcrumbs={[{ label: "Admin" }, { label: "Dashboard" }]}
    >
      <Card className="p-4">
        <p className="type-body-sm text-text-secondary">Protected admin area scaffolded in Sprint 13.</p>
        <ul className="mt-4 list-disc pl-5 type-body-sm text-text-secondary">
          <li>
            <Link href="/admin/events" className="underline">
              Manage events
            </Link>
          </li>
          <li>
            <Link href="/admin/offers" className="underline">
              Manage service offers
            </Link>
          </li>
          <li>
            <Link href="/admin/intake" className="underline">
              Open intake triage queue
            </Link>
          </li>
          <li>
            <Link href="/admin/commercial" className="underline">
              Open commercial operations
            </Link>
          </li>
          <li>
            <Link href="/admin/audit" className="underline">
              Open audit log viewer
            </Link>
          </li>
          <li>
            <Link href="/admin/flywheel" className="underline">
              Flywheel metrics
            </Link>
          </li>
        </ul>
      </Card>
    </PageShell>
  );
}
