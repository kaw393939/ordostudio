"use client";

import { useEffect, useState } from "react";
import { PageShell } from "@/components/layout/page-shell";
import { Card } from "@/components/primitives";
import { ProblemDetailsPanel } from "@/components/problem-details";
import { requestHal, type ProblemDetails } from "@/lib/hal-client";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type MeasurementEventKey = string;

type Summary = {
  window: "7d" | "30d";
  totals: Array<{ event_key: MeasurementEventKey; count: number }>;
  funnel: { label: string; view: number; start: number; submit: number };
  topCtas: Array<{ event_key: MeasurementEventKey; count: number }>;
};

type MeasurementResponse = {
  windows: {
    "7d": Summary;
    "30d": Summary;
  };
};

/* Pull a single count from the totals array for a given key */
const countFor = (totals: Summary["totals"], key: string): number => {
  return totals.find((t) => t.event_key === key)?.count ?? 0;
};

/* ------------------------------------------------------------------ */
/*  Metric card helper                                                 */
/* ------------------------------------------------------------------ */

function MetricRow({ label, value7d, value30d }: { label: string; value7d: number; value30d: number }) {
  return (
    <tr>
      <td className="px-3 py-2 type-meta text-text-secondary">{label}</td>
      <td className="px-3 py-2 text-right type-meta text-text-primary">{value7d}</td>
      <td className="px-3 py-2 text-right type-meta text-text-primary">{value30d}</td>
    </tr>
  );
}

function SectionTable({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="p-4">
      <h2 className="type-title">{title}</h2>
      <table className="mt-3 w-full border-collapse">
        <thead>
          <tr>
            <th className="px-3 py-2 text-left type-meta text-text-muted">Metric</th>
            <th className="px-3 py-2 text-right type-meta text-text-muted">7d</th>
            <th className="px-3 py-2 text-right type-meta text-text-muted">30d</th>
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function AdminFlywheelPage() {
  const [pending, setPending] = useState(true);
  const [problem, setProblem] = useState<ProblemDetails | null>(null);
  const [data, setData] = useState<MeasurementResponse | null>(null);

  useEffect(() => {
    const load = async () => {
      setPending(true);
      const response = await requestHal<MeasurementResponse>(
        "/api/v1/admin/measurement",
        { cache: "no-store" },
      );
      if (!response.ok) {
        setProblem(response.problem);
        setData(null);
        setPending(false);
        return;
      }
      setProblem(null);
      setData(response.data);
      setPending(false);
    };
    void load();
  }, []);

  const s7 = data?.windows["7d"] ?? null;
  const s30 = data?.windows["30d"] ?? null;

  return (
    <PageShell
      title="Flywheel Metrics"
      subtitle="Community → Corporate → Apprentice conversion pipeline."
      breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Flywheel" }]}
    >
      {problem ? (
        <div className="mb-4">
          <ProblemDetailsPanel problem={problem} />
        </div>
      ) : null}

      {pending ? <p className="type-meta text-text-muted">Loading…</p> : null}

      {s7 && s30 ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {/* ── Community Metrics ────────────────────────── */}
          <SectionTable title="Community Engagement">
            <MetricRow
              label="Community registrations"
              value7d={countFor(s7.totals, "COMMUNITY_EVENT_REGISTER")}
              value30d={countFor(s30.totals, "COMMUNITY_EVENT_REGISTER")}
            />
            <MetricRow
              label="Newsletter subscribes"
              value7d={countFor(s7.totals, "NEWSLETTER_SUBSCRIBE")}
              value30d={countFor(s30.totals, "NEWSLETTER_SUBSCRIBE")}
            />
            <MetricRow
              label="Email captures (lead magnets)"
              value7d={countFor(s7.totals, "EMAIL_CAPTURE")}
              value30d={countFor(s30.totals, "EMAIL_CAPTURE")}
            />
            <MetricRow
              label="Lead magnet downloads"
              value7d={countFor(s7.totals, "LEAD_MAGNET_DOWNLOAD")}
              value30d={countFor(s30.totals, "LEAD_MAGNET_DOWNLOAD")}
            />
          </SectionTable>

          {/* ── Corporate Metrics ────────────────────────── */}
          <SectionTable title="Corporate Pipeline">
            <MetricRow
              label="Consult page views"
              value7d={countFor(s7.totals, "PAGE_VIEW_SERVICES_REQUEST")}
              value30d={countFor(s30.totals, "PAGE_VIEW_SERVICES_REQUEST")}
            />
            <MetricRow
              label="Consult form starts"
              value7d={countFor(s7.totals, "FORM_START_CONSULT_REQUEST")}
              value30d={countFor(s30.totals, "FORM_START_CONSULT_REQUEST")}
            />
            <MetricRow
              label="Consult submissions"
              value7d={countFor(s7.totals, "FORM_SUBMIT_CONSULT_REQUEST_SUCCESS")}
              value30d={countFor(s30.totals, "FORM_SUBMIT_CONSULT_REQUEST_SUCCESS")}
            />
            <MetricRow
              label="Services page views"
              value7d={countFor(s7.totals, "PAGE_VIEW_SERVICES")}
              value30d={countFor(s30.totals, "PAGE_VIEW_SERVICES")}
            />
          </SectionTable>

          {/* ── Conversion Funnel ────────────────────────── */}
          <SectionTable title="Conversion Funnel">
            <MetricRow
              label="Homepage views"
              value7d={countFor(s7.totals, "PAGE_VIEW_HOME")}
              value30d={countFor(s30.totals, "PAGE_VIEW_HOME")}
            />
            <MetricRow
              label="CTA → Training tracks"
              value7d={countFor(s7.totals, "CTA_CLICK_VIEW_TRAINING_TRACKS")}
              value30d={countFor(s30.totals, "CTA_CLICK_VIEW_TRAINING_TRACKS")}
            />
            <MetricRow
              label="CTA → Book consult"
              value7d={countFor(s7.totals, "CTA_CLICK_BOOK_TECHNICAL_CONSULT")}
              value30d={countFor(s30.totals, "CTA_CLICK_BOOK_TECHNICAL_CONSULT")}
            />
          </SectionTable>

          {/* ── Flywheel summary card ─────────────────────── */}
          <Card className="p-4">
            <h2 className="type-title">Flywheel Health</h2>
            <p className="mt-2 type-body-sm text-text-secondary">
              The flywheel tracks how community engagement converts into commercial outcomes:
            </p>
            <ol className="mt-3 list-decimal pl-5 type-body-sm text-text-secondary space-y-1">
              <li>
                <strong>Attract</strong> — free community events, newsletter, lead magnets
              </li>
              <li>
                <strong>Engage</strong> — email captures, resource downloads, repeat attendance
              </li>
              <li>
                <strong>Convert</strong> — corporate consult requests, package selections
              </li>
              <li>
                <strong>Expand</strong> — apprentice pipeline, team programs, referrals
              </li>
            </ol>
            <p className="mt-3 type-meta text-text-muted">
              All metrics sourced from the measurement_events table. Add new event types as the pipeline matures.
            </p>
          </Card>
        </div>
      ) : null}
    </PageShell>
  );
}
