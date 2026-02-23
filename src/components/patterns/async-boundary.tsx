import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

type AsyncBoundaryProps<T> = {
  isLoading: boolean;
  error: string | null;
  data: T | null;
  renderData: (data: T) => ReactNode;
  onRetry?: () => void;
  loadingRows?: number;
  loadingTitle?: string;
  loadingDescription?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
};

/**
 * Orchestrates the loading → error → empty → data state trinity.
 *
 * Priority: loading > error > empty > data
 * - Loading: skeleton shimmer matching expected layout
 * - Error: icon + message + retry button
 * - Empty: title + description + optional CTA
 * - Data: rendered via `renderData` callback
 */
export function AsyncBoundary<T>({
  isLoading,
  error,
  data,
  renderData,
  onRetry,
  loadingRows = 3,
  loadingTitle = "Loading",
  loadingDescription = "Please wait while we fetch the latest data.",
  emptyTitle = "No results",
  emptyDescription = "Nothing to display.",
  emptyAction,
}: AsyncBoundaryProps<T>) {
  // Priority 1: Loading
  if (isLoading) {
    return (
      <section
        className="rounded-lg border bg-card p-6"
        aria-live="polite"
        aria-busy="true"
      >
        <h2 className="text-lg font-semibold text-foreground">{loadingTitle}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {loadingDescription}
        </p>
        <div className="mt-4 space-y-3">
          {Array.from({ length: Math.max(1, loadingRows) }).map((_, i) => (
            <Skeleton key={`loading-row-${i}`} className="h-4 w-full" />
          ))}
        </div>
      </section>
    );
  }

  // Priority 2: Error
  if (error) {
    return (
      <section
        className="rounded-lg border bg-card p-6"
        role="alert"
        aria-live="assertive"
      >
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 size-5 shrink-0 text-destructive" />
          <div>
            <h2 className="text-lg font-semibold text-destructive">
              Something went wrong
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{error}</p>
          </div>
        </div>
        {onRetry ? (
          <div className="mt-4">
            <Button variant="outline" onClick={onRetry}>
              Retry
            </Button>
          </div>
        ) : null}
      </section>
    );
  }

  // Priority 3: Empty
  const isEmpty =
    data === null ||
    data === undefined ||
    (Array.isArray(data) && data.length === 0);
  if (isEmpty) {
    return (
      <section
        className="rounded-lg border bg-card p-6 text-center"
        aria-live="polite"
      >
        <h2 className="text-lg font-semibold text-foreground">{emptyTitle}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{emptyDescription}</p>
        {emptyAction ? <div className="mt-4">{emptyAction}</div> : null}
      </section>
    );
  }

  // Priority 4: Data
  return <>{renderData(data)}</>;
}
