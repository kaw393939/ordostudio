"use client";

import Link from "next/link";
import { CheckCircle2, Clock, PlayCircle, XCircle } from "lucide-react";
import { Card } from "@/components/primitives";
import { RelativeTime } from "@/components/forms/relative-time";
import { useState } from "react";
import { cn } from "@/lib/ui";
import { parseISO } from "@/lib/date-time";
import { formatEventPrimaryRange } from "@/lib/event-date-ui";

export type EventCardModel = {
  id: string;
  title: string;
  slug: string;
  status: string;
  startAt: string;
  endAt: string;
  timezone: string;
  detailHref: string;
  locationText?: string | null;
  meetingUrl?: string | null;
  description?: string | null;
  metadataJson?: string | null;
};

type Pill = {
  label: "Open" | "Closing Soon" | "Closed" | "In Progress";
  className: string;
  Icon: React.ComponentType<{ className?: string }>;
};

export function resolveStatusPill(model: Pick<EventCardModel, "status" | "startAt" | "endAt">, nowMs: number): Pill {
  if (model.status === "CANCELLED") {
    return { label: "Closed", className: "border border-border-default text-text-secondary", Icon: XCircle };
  }

  const startMs = parseISO(model.startAt).getTime();
  const endMs = parseISO(model.endAt).getTime();

  if (nowMs >= startMs && nowMs <= endMs) {
    return { label: "In Progress", className: "border border-state-info text-state-info", Icon: PlayCircle };
  }

  if (nowMs > endMs) {
    return { label: "Closed", className: "border border-border-default text-text-secondary", Icon: XCircle };
  }

  const msUntilStart = startMs - nowMs;
  const WEEK = 7 * 24 * 60 * 60 * 1000;
  if (msUntilStart <= WEEK) {
    return { label: "Closing Soon", className: "border border-state-warning text-state-warning", Icon: Clock };
  }

  return { label: "Open", className: "border border-state-success text-state-success", Icon: CheckCircle2 };
}

export function EventCard({ model, className }: { model: EventCardModel; className?: string }) {
  const [nowMs] = useState(() => Date.now());
  const pill = resolveStatusPill(model, nowMs);
  const range = formatEventPrimaryRange({ startIso: model.startAt, endIso: model.endAt, timezone: model.timezone });

  const metadata = (() => {
    if (!model.metadataJson) return null;
    try {
      return JSON.parse(model.metadataJson) as { category?: string | null };
    } catch {
      return null;
    }
  })();

  const isCommunity = metadata?.category === "COMMUNITY";

  return (
    <Card
      className={cn(
        "group p-4 motion-base transition hover:border-border-strong focus-within:border-border-strong",
        className,
      )}
    >
      {/* Line 1: Date range */}
      <p className="type-meta text-text-secondary">{range}</p>

      {/* Line 2: Title */}
      <Link href={model.detailHref} className="mt-1 block type-title text-text-primary underline motion-base">
        {model.title}
      </Link>

      {/* Line 3: Status pill + relative time + optional Free badge */}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className={cn("inline-flex shrink-0 items-center gap-1 rounded-sm px-2 py-0.5 type-meta", pill.className)}>
          <pill.Icon className="size-3.5" />
          {pill.label}
        </span>
        <span className="type-meta text-text-muted">
          <RelativeTime iso={model.startAt} />
        </span>
        {isCommunity ? (
          <span className="rounded-sm bg-state-success/15 px-2 py-0.5 type-meta text-state-success">
            Free
          </span>
        ) : null}
      </div>
    </Card>
  );
}
