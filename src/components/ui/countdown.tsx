"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/ui";
import { parseISO } from "@/lib/date-time";

type CountdownProps = {
  /** Deadline as a UTC ISO-8601 string. */
  deadlineIso: string;
  className?: string;
  /** Defaults to 60s. Exposed for tests. */
  updateIntervalMs?: number;
};

type CountdownParts = {
  expired: boolean;
  days: number;
  hours: number;
  minutes: number;
  urgent: boolean;
};

function getCountdownParts(deadlineIso: string, nowMs: number): CountdownParts {
  const deadline = parseISO(deadlineIso);
  const diffMs = deadline.getTime() - nowMs;
  if (diffMs <= 0) {
    return { expired: true, days: 0, hours: 0, minutes: 0, urgent: false };
  }

  const MINUTE = 60_000;
  const HOUR = 60 * MINUTE;
  const DAY = 24 * HOUR;

  const days = Math.floor(diffMs / DAY);
  const hours = Math.floor((diffMs % DAY) / HOUR);
  const minutes = Math.floor((diffMs % HOUR) / MINUTE);
  const urgent = diffMs < HOUR;

  return { expired: false, days, hours, minutes, urgent };
}

export function Countdown({ deadlineIso, className, updateIntervalMs = 60_000 }: CountdownProps) {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), updateIntervalMs);
    return () => window.clearInterval(id);
  }, [updateIntervalMs]);

  const parts = useMemo(() => getCountdownParts(deadlineIso, nowMs), [deadlineIso, nowMs]);

  if (parts.expired) {
    return <span className={cn("type-meta text-text-muted", className)}>Registration closed</span>;
  }

  return (
    <span
      className={cn(
        "type-meta tabular-nums text-text-primary",
        parts.urgent && "animate-pulse",
        className,
      )}
      aria-label={`Registration closes in ${parts.days} days ${parts.hours} hours ${parts.minutes} minutes`}
    >
      {`${parts.days}d ${parts.hours}h ${parts.minutes}m`}
    </span>
  );
}

export { getCountdownParts };
