import type { ReactNode } from "react";

type SuccessStateProps = {
  title: string;
  description?: string;
  action?: ReactNode;
};

export function SuccessState({ title, description, action }: SuccessStateProps) {
  return (
    <section className="surface p-6" aria-live="polite">
      <h2 className="type-title text-state-success">{title}</h2>
      {description ? (
        <p className="type-body mt-2 text-text-secondary">{description}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </section>
  );
}
