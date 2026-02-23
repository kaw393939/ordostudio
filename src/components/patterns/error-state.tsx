import type { ReactNode } from "react";

type ErrorStateProps = {
  title?: string;
  description: string;
  action?: ReactNode;
  supportCode?: string;
};

export function ErrorState({
  title = "Something went wrong",
  description,
  action,
  supportCode,
}: ErrorStateProps) {
  return (
    <section className="surface-elevated p-6" role="alert" aria-live="assertive">
      <h2 className="type-title text-state-danger">{title}</h2>
      <p className="type-body mt-2 text-text-secondary">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
      {supportCode ? (
        <details className="mt-4">
          <summary className="type-meta cursor-pointer text-text-muted">
            Support details
          </summary>
          <p className="type-meta mt-2 text-text-muted">request_id: {supportCode}</p>
        </details>
      ) : null}
    </section>
  );
}
