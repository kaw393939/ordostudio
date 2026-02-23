"use client";

import { useEffect, useMemo, useState } from "react";
import { PageShell } from "@/components/layout/page-shell";
import { Card } from "@/components/primitives";
import { ProblemDetailsPanel } from "@/components/problem-details";
import { requestHal, type ProblemDetails } from "@/lib/hal-client";

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

const renderRows = (items: Array<{ event_key: MeasurementEventKey; count: number }>) => {
  return items.map((row) => (
    <tr key={row.event_key}>
      <td className="px-3 py-2 type-meta text-text-secondary">{row.event_key}</td>
      <td className="px-3 py-2 text-right type-meta text-text-primary">{row.count}</td>
    </tr>
  ));
};

export default function AdminMeasurementPage() {
  const [pending, setPending] = useState(true);
  const [problem, setProblem] = useState<ProblemDetails | null>(null);
  const [data, setData] = useState<MeasurementResponse | null>(null);

  useEffect(() => {
    const load = async () => {
      setPending(true);
      const response = await requestHal<MeasurementResponse>("/api/v1/admin/measurement", { cache: "no-store" });
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

  const seven = useMemo(() => data?.windows["7d"] ?? null, [data]);
  const thirty = useMemo(() => data?.windows["30d"] ?? null, [data]);

  return (
    <PageShell
      title="Measurement"
      subtitle="Lightweight conversion metrics (7d/30d)."
      breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Measurement" }]}
    >
      {problem ? (
        <div className="mb-4">
          <ProblemDetailsPanel problem={problem} />
        </div>
      ) : null}

      {pending ? <p className="type-meta text-text-muted">Loading…</p> : null}

      {seven && thirty ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="p-4">
            <h2 className="type-title">Totals (7d)</h2>
            <table className="mt-3 w-full border-collapse">
              <thead>
                <tr>
                  <th className="px-3 py-2 text-left type-meta text-text-muted">Event</th>
                  <th className="px-3 py-2 text-right type-meta text-text-muted">Count</th>
                </tr>
              </thead>
              <tbody>{renderRows(seven.totals)}</tbody>
            </table>

            <h3 className="mt-6 type-label">Funnel</h3>
            <p className="mt-1 type-meta text-text-muted">{seven.funnel.label}</p>
            <table className="mt-3 w-full border-collapse">
              <tbody>
                <tr>
                  <td className="px-3 py-2 type-meta text-text-secondary">View</td>
                  <td className="px-3 py-2 text-right type-meta text-text-primary">{seven.funnel.view}</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 type-meta text-text-secondary">Start</td>
                  <td className="px-3 py-2 text-right type-meta text-text-primary">{seven.funnel.start}</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 type-meta text-text-secondary">Submit</td>
                  <td className="px-3 py-2 text-right type-meta text-text-primary">{seven.funnel.submit}</td>
                </tr>
              </tbody>
            </table>

            <h3 className="mt-6 type-label">Top CTAs</h3>
            <table className="mt-3 w-full border-collapse">
              <thead>
                <tr>
                  <th className="px-3 py-2 text-left type-meta text-text-muted">CTA</th>
                  <th className="px-3 py-2 text-right type-meta text-text-muted">Clicks</th>
                </tr>
              </thead>
              <tbody>{renderRows(seven.topCtas)}</tbody>
            </table>
          </Card>

          <Card className="p-4">
            <h2 className="type-title">Totals (30d)</h2>
            <table className="mt-3 w-full border-collapse">
              <thead>
                <tr>
                  <th className="px-3 py-2 text-left type-meta text-text-muted">Event</th>
                  <th className="px-3 py-2 text-right type-meta text-text-muted">Count</th>
                </tr>
              </thead>
              <tbody>{renderRows(thirty.totals)}</tbody>
            </table>

            <h3 className="mt-6 type-label">Funnel</h3>
            <p className="mt-1 type-meta text-text-muted">{thirty.funnel.label}</p>
            <table className="mt-3 w-full border-collapse">
              <tbody>
                <tr>
                  <td className="px-3 py-2 type-meta text-text-secondary">View</td>
                  <td className="px-3 py-2 text-right type-meta text-text-primary">{thirty.funnel.view}</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 type-meta text-text-secondary">Start</td>
                  <td className="px-3 py-2 text-right type-meta text-text-primary">{thirty.funnel.start}</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 type-meta text-text-secondary">Submit</td>
                  <td className="px-3 py-2 text-right type-meta text-text-primary">{thirty.funnel.submit}</td>
                </tr>
              </tbody>
            </table>

            <h3 className="mt-6 type-label">Top CTAs</h3>
            <table className="mt-3 w-full border-collapse">
              <thead>
                <tr>
                  <th className="px-3 py-2 text-left type-meta text-text-muted">CTA</th>
                  <th className="px-3 py-2 text-right type-meta text-text-muted">Clicks</th>
                </tr>
              </thead>
              <tbody>{renderRows(thirty.topCtas)}</tbody>
            </table>
          </Card>
        </div>
      ) : null}
    </PageShell>
  );
}
