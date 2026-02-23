import type { ReactNode } from "react";

type EmptyStateProps = {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
};

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <section className="surface p-6 text-center" aria-live="polite">
      {icon ? (
        <div className="mx-auto mb-3 inline-flex size-12 items-center justify-center rounded-sm border border-border-default bg-surface text-text-secondary">
          {icon}
        </div>
      ) : null}
      <h2 className="type-title text-text-primary">{title}</h2>
      <p className="type-body mt-2 text-text-secondary">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </section>
  );
}
