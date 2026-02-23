"use client";

import * as React from "react";
import { cn } from "@/lib/ui/cn";

type CharacterCountProps = {
  value: string;
  maxLength: number;
  className?: string;
};

/**
 * Displays character count (current / max) with visual warning
 * when approaching or exceeding the limit.
 */
export function CharacterCount({ value, maxLength, className }: CharacterCountProps) {
  const count = value.length;
  const ratio = count / maxLength;
  const isWarning = ratio >= 0.9;
  const isOver = count > maxLength;

  return (
    <span
      data-warning={isWarning ? "true" : "false"}
      data-overlimit={isOver ? "true" : "false"}
      className={cn(
        "text-xs text-muted-foreground",
        isWarning && !isOver && "text-warning",
        isOver && "text-destructive font-medium",
        className
      )}
    >
      {count} / {maxLength}
    </span>
  );
}
