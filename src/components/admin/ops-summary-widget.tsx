"use client";

import { DEFAULT_LOCALE } from "@/platform/locale";
import { useOpsSummary } from "@/lib/hooks/use-ops-summary";

function cents(n: number): string {
  return `$${(n / 100).toLocaleString(DEFAULT_LOCALE, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

export function OpsSummaryWidget() {
  const { data, loading, error, refresh } = useOpsSummary();

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-sm text-destructive">
        <p className="font-medium">Failed to load ops summary</p>
        <p className="mt-1 text-xs opacity-80">{error}</p>
        <button
          onClick={() => void refresh()}
          className="mt-2 text-xs underline hover:no-underline"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  const rev = data.revenue_summary;
  const act = data.activity_summary;

  return (
    <div className="flex flex-col gap-6 p-4 overflow-y-auto h-full">
      {/* Revenue */}
      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Revenue — last {rev.period_days}d
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <Stat label="Platform" value={cents(rev.platform_revenue_cents)} />
          <Stat label="Net" value={cents(rev.net_revenue_cents)} highlight />
          <Stat label="Commissions" value={cents(rev.referrer_commissions_cents)} />
          <Stat label="Payouts" value={cents(rev.provider_payouts_cents)} />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {rev.deal_count} deal{rev.deal_count !== 1 ? "s" : ""}
        </p>
      </section>

      {/* Activity */}
      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Activity — last {act.period_days}d
        </h3>
        {act.activity.length === 0 ? (
          <p className="text-xs text-muted-foreground">No activity yet.</p>
        ) : (
          <ul className="space-y-1.5">
            {act.activity.slice(0, 10).map((row) => (
              <li
                key={row.type}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-muted-foreground truncate max-w-[160px]">
                  {row.type}
                </span>
                <span className="font-medium tabular-nums">{row.count}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <button
        onClick={() => void refresh()}
        className="mt-auto text-xs text-muted-foreground hover:text-foreground underline self-start"
      >
        Refresh
      </button>
    </div>
  );
}

function Stat({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-md border bg-card p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={`mt-0.5 text-lg font-semibold tabular-nums ${
          highlight ? "text-primary" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}
