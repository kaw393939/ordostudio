"use client";

import { Card } from "@/components/primitives";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/ui";

export function EventCardSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn("p-4", className)}>
      <Skeleton className="h-3 w-1/3" />
      <Skeleton className="mt-1 h-5 w-3/4" />
      <div className="mt-2 flex gap-2">
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-5 w-24" />
      </div>
    </Card>
  );
}
