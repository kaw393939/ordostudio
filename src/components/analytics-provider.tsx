"use client";

import { useEffect } from "react";
import { analytics } from "@/lib/analytics";

/**
 * Analytics provider — initialises the analytics facade once on mount.
 * Drop this into the root layout. It respects Do Not Track and opt-out
 * cookies automatically via the analytics facade.
 *
 * When PostHog is connected, this component becomes the initialisation
 * boundary for the PostHogProvider.
 */
export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    analytics.init();
  }, []);

  return <>{children}</>;
}
