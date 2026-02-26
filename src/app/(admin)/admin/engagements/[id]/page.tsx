import Link from "next/link";
import { notFound } from "next/navigation";
import { resolveConfig } from "@/platform/config";
import { openCliDb } from "@/platform/runtime";
import { PageShell } from "@/components/layout/page-shell";
import { Card } from "@/components/primitives";
import { Badge } from "@/components/ui/badge";
import { formatCents } from "@/lib/currency";
import { completeEngagement } from "../actions";

type Engagement = {
  id: string;
  type: "PROJECT_COMMISSION" | "MAESTRO_TRAINING";
  client_name: string | null;
  student_id: string | null;
  project_type: string | null;
  total_value: number | null;
  commission: number | null;
  referral_code: string | null;
  track: string | null;
  cohort_start: string | null;
  payment_status: "PENDING" | "RECEIVED" | "REFUNDED";
  status: "ACTIVE" | "COMPLETED" | "CANCELLED";
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type LedgerRow = {
  id: string;
  entry_type: string;
  amount_cents: number;
  currency: string;
  status: string;
  earned_at: string;
};

function getEngagement(id: string): Engagement | undefined {
  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);
  try {
    return db
      .prepare("SELECT * FROM engagements WHERE id = ?")
      .get(id) as Engagement | undefined;
  } finally {
    db.close();
  }
}

function getLedgerEntries(engagementId: string): LedgerRow[] {
  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);
  try {
    return db
      .prepare(
        "SELECT id, entry_type, amount_cents, currency, status, earned_at FROM ledger_entries WHERE engagement_id = ? ORDER BY earned_at ASC",
      )
      .all(engagementId) as LedgerRow[];
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

const Field = ({ label, value }: { label: string; value?: string | number | null }) => (
  <div>
    <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
      {label}
    </dt>
    <dd className="mt-0.5 text-sm">{value ?? "—"}</dd>
  </div>
);

export default async function EngagementDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const engagement = getEngagement(id);
  if (!engagement) notFound();

  const ledgerEntries = getLedgerEntries(id);

  const canComplete = engagement.status === "ACTIVE";
  const completeAction = completeEngagement.bind(null, id);

  const typeLabel =
    engagement.type === "PROJECT_COMMISSION" ? "Project Commission" : "Maestro Training";

  return (
    <PageShell
      title={typeLabel}
      subtitle={`Engagement ID: ${engagement.id}`}
      breadcrumbs={[
        { label: "Admin", href: "/admin" },
        { label: "Engagements", href: "/admin/engagements" },
        { label: typeLabel },
      ]}
    >
      <div className="grid gap-6 max-w-2xl">

        {/* Status + action row */}
        <div className="flex items-center gap-3">
          <Badge variant={statusVariant(engagement.status)}>
            {engagement.status.toLowerCase()}
          </Badge>
          {canComplete && (
            <form action={completeAction}>
              <button
                type="submit"
                className="inline-flex items-center rounded-md bg-foreground px-3 py-1.5 text-sm font-medium text-background hover:opacity-90"
              >
                Mark as Completed
              </button>
            </form>
          )}
          {!canComplete && engagement.status === "COMPLETED" && (
            <span className="text-sm text-muted-foreground">Completed</span>
          )}
        </div>

        {/* Detail fields */}
        <Card className="p-5">
          <dl className="grid grid-cols-2 gap-4">
            <Field label="Type" value={typeLabel} />
            <Field label="Payment status" value={engagement.payment_status.toLowerCase()} />

            {engagement.type === "PROJECT_COMMISSION" && (
              <>
                <Field label="Client name" value={engagement.client_name} />
                <Field label="Project type" value={engagement.project_type} />
              </>
            )}
            {engagement.type === "MAESTRO_TRAINING" && (
              <>
                <Field label="Student" value={engagement.student_id} />
                <Field label="Track" value={engagement.track} />
                <Field label="Cohort start" value={engagement.cohort_start} />
              </>
            )}

            <Field
              label="Total value"
              value={
                engagement.total_value != null
                  ? formatCents(engagement.total_value)
                  : undefined
              }
            />
            <Field
              label="Commission (20%)"
              value={
                engagement.commission != null
                  ? formatCents(engagement.commission)
                  : undefined
              }
            />
            <Field label="Referral code" value={engagement.referral_code} />
            <Field label="Created" value={new Date(engagement.created_at).toLocaleDateString()} />
            {engagement.notes && (
              <div className="col-span-2">
                <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Notes
                </dt>
                <dd className="mt-0.5 text-sm whitespace-pre-wrap">{engagement.notes}</dd>
              </div>
            )}
          </dl>
        </Card>

        {/* Ledger entries */}
        {ledgerEntries.length > 0 && (
          <Card className="overflow-hidden">
            <div className="px-4 py-3 border-b text-sm font-medium">Ledger entries</div>
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Type</th>
                  <th className="px-4 py-2 text-right font-medium">Amount</th>
                  <th className="px-4 py-2 text-left font-medium">Status</th>
                  <th className="px-4 py-2 text-left font-medium">Earned</th>
                </tr>
              </thead>
              <tbody>
                {ledgerEntries.map((le) => (
                  <tr key={le.id} className="border-b last:border-0">
                    <td className="px-4 py-2 capitalize">
                      {le.entry_type.replace(/_/g, " ").toLowerCase()}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {formatCents(le.amount_cents, le.currency)}
                    </td>
                    <td className="px-4 py-2">{le.status.toLowerCase()}</td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {new Date(le.earned_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}

        <div>
          <Link
            href="/admin/engagements"
            className="text-sm text-muted-foreground hover:text-foreground underline"
          >
            ← Back to engagements
          </Link>
        </div>
      </div>
    </PageShell>
  );
}
