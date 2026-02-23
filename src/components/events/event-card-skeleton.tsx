"use client";

import { Card } from "@/components/primitives";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/ui";

export function EventCardSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn("p-4", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-3/5" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-1/3" />
          <Skeleton className="h-3 w-2/5" />
        </div>
        <Skeleton className="h-6 w-24" />
      </div>
    </Card>
  );
}
