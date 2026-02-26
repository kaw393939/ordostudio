"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface OpsSummary {
  revenue_summary: {
    period_days: number;
    platform_revenue_cents: number;
    referrer_commissions_cents: number;
    provider_payouts_cents: number;
    net_revenue_cents: number;
    gross_revenue_cents: number;
    deal_count: number;
    entry_count: number;
  };
  activity_summary: {
    period_days: number;
    activity: Array<{ type: string; count: number; last_at: string }>;
  };
}

const POLL_INTERVAL_MS = 30_000;

export function useOpsSummary() {
  const [data, setData] = useState<OpsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchSummary = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/admin/ops-summary", {
        credentials: "include",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError((body as { detail?: string }).detail ?? `HTTP ${res.status}`);
        return;
      }
      const json = (await res.json()) as OpsSummary;
      setData(json);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load summary");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchSummary();

    timerRef.current = setInterval(() => {
      void fetchSummary();
    }, POLL_INTERVAL_MS);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [fetchSummary]);

  return { data, loading, error, refresh: fetchSummary };
}
