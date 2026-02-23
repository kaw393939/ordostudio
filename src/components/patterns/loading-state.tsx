type LoadingStateProps = {
  title?: string;
  description?: string;
  rows?: number;
};

export function LoadingState({
  title = "Loading",
  description = "Please wait while we fetch the latest data.",
  rows = 3,
}: LoadingStateProps) {
  const skeletonRows = Array.from({ length: Math.max(1, rows) });

  return (
    <section className="surface-elevated p-6" aria-live="polite" aria-busy="true">
      <h2 className="type-title text-text-primary">{title}</h2>
      <p className="type-body-sm mt-1 text-text-secondary">{description}</p>
      <div className="mt-4 space-y-3">
        {skeletonRows.map((_, index) => (
          <div
            key={`loading-row-${index}`}
            className="h-4 w-full animate-pulse rounded-sm bg-border-subtle"
          />
        ))}
      </div>
    </section>
  );
}
