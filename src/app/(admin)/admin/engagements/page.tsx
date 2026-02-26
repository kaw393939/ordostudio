import Link from "next/link";
import { resolveConfig } from "@/platform/config";
import { openCliDb } from "@/platform/runtime";
import { PageShell } from "@/components/layout/page-shell";
import { Card } from "@/components/primitives";
import { Badge } from "@/components/ui/badge";
import { formatCents } from "@/lib/currency";

export const metadata = {
  title: "Admin • Engagements",
};

type Engagement = {
  id: string;
  type: "PROJECT_COMMISSION" | "MAESTRO_TRAINING";
  client_name: string | null;
  student_id: string | null;
  project_type: string | null;
  total_value: number | null;
  commission: number | null;
  payment_status: "PENDING" | "RECEIVED" | "REFUNDED";
  status: "ACTIVE" | "COMPLETED" | "CANCELLED";
  referral_code: string | null;
  created_at: string;
};

function getEngagements(typeFilter: string | undefined): Engagement[] {
  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);
  try {
    if (typeFilter === "PROJECT_COMMISSION" || typeFilter === "MAESTRO_TRAINING") {
      return db
        .prepare("SELECT * FROM engagements WHERE type = ? ORDER BY created_at DESC")
        .all(typeFilter) as Engagement[];
    }
    return db
      .prepare("SELECT * FROM engagements ORDER BY created_at DESC")
      .all() as Engagement[];
  } finally {
    db.close();
  }
}

const statusVariant = (
  s: Engagement["status"],
): "default" | "secondary" | "outline" | "destructive" => {
  if (s === "COMPLETED") return "default";
  if (s === "CANCELLED") return "destructive";
  return "secondary";
};

const paymentVariant = (
  p: Engagement["payment_status"],
): "default" | "secondary" | "outline" | "destructive" => {
  if (p === "RECEIVED") return "default";
  if (p === "REFUNDED") return "destructive";
  return "outline";
};

export default async function AdminEngagementsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const typeFilter =
    tab === "project"
      ? "PROJECT_COMMISSION"
      : tab === "maestro"
        ? "MAESTRO_TRAINING"
        : undefined;

  const engagements = getEngagements(typeFilter);

  const tabs = [
    { key: undefined, label: "All", href: "/admin/engagements" },
    { key: "project", label: "Project Commissions", href: "/admin/engagements?tab=project" },
    { key: "maestro", label: "Maestro Training", href: "/admin/engagements?tab=maestro" },
  ];

  return (
    <PageShell
      title="Engagements"
      subtitle="Track project commissions and Maestro Training enrolments."
      breadcrumbs={[
        { label: "Admin", href: "/admin" },
        { label: "Engagements" },
      ]}
    >
      {/* Header row */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2 border-b pb-2 flex-1">
          {tabs.map((t) => {
            const active = t.key === tab;
            return (
              <Link
                key={t.label}
                href={t.href}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  active
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.label}
              </Link>
            );
          })}
        </div>
        <Link
          href="/admin/engagements/new"
          className="ml-4 inline-flex items-center rounded-md bg-foreground px-3 py-1.5 text-sm font-medium text-background hover:opacity-90"
        >
          + New Engagement
        </Link>
      </div>

      {engagements.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">
          No engagements yet.{" "}
          <Link href="/admin/engagements/new" className="underline">
            Create the first one.
          </Link>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Client / Student</th>
                <th className="px-4 py-2 text-left font-medium">Type</th>
                <th className="px-4 py-2 text-right font-medium">Total</th>
                <th className="px-4 py-2 text-right font-medium">Commission</th>
                <th className="px-4 py-2 text-left font-medium">Payment</th>
                <th className="px-4 py-2 text-left font-medium">Status</th>
                <th className="px-4 py-2 text-left font-medium">Ref</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {engagements.map((e) => (
                <tr key={e.id} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-2">
                    {e.type === "MAESTRO_TRAINING"
                      ? (e.student_id ?? "—")
                      : (e.client_name ?? "—")}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    {e.type === "PROJECT_COMMISSION" ? "Project" : "Maestro"}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {e.total_value != null ? formatCents(e.total_value) : "—"}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {e.commission != null ? formatCents(e.commission) : "—"}
                  </td>
                  <td className="px-4 py-2">
                    <Badge variant={paymentVariant(e.payment_status)}>
                      {e.payment_status.toLowerCase()}
                    </Badge>
                  </td>
                  <td className="px-4 py-2">
                    <Badge variant={statusVariant(e.status)}>
                      {e.status.toLowerCase()}
                    </Badge>
                  </td>
                  <td className="px-4 py-2 font-mono text-xs">
                    {e.referral_code ?? "—"}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Link
                      href={`/admin/engagements/${e.id}`}
                      className="text-xs underline text-muted-foreground hover:text-foreground"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </PageShell>
  );
}
