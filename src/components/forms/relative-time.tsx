"use client";

import * as React from "react";
import { formatRelative, formatAbsolute, getLocalTimezone } from "@/lib/date-time";

export type RelativeTimeProps = {
  /** UTC ISO 8601 timestamp */
  iso: string;
  /** Update interval in ms (default: 60000 = 1 minute) */
  updateInterval?: number;
  /** Additional className */
  className?: string;
};

/**
 * Displays a human-friendly relative timestamp ("3 days ago", "in 2 hours").
 * Auto-updates on a configurable interval.
 * Shows full absolute time in a title/tooltip on hover.
 * Uses a semantic <time> element with dateTime attribute.
 */
export function RelativeTime({
  iso,
  updateInterval = 60_000,
  className,
}: RelativeTimeProps) {
  const [text, setText] = React.useState(() => formatRelative(iso));

  React.useEffect(() => {
    // Update immediately in case the value changed
    setText(formatRelative(iso));

    const id = setInterval(() => {
      setText(formatRelative(iso));
    }, updateInterval);

    return () => clearInterval(id);
  }, [iso, updateInterval]);

  const tooltip = formatAbsolute(iso, getLocalTimezone());

  return (
    <time dateTime={iso} title={tooltip} className={className}>
      {text}
    </time>
  );
}
