import type { ReactNode } from "react";
import { Breadcrumbs } from "@/components/patterns/breadcrumbs";
import { cn } from "@/lib/ui/cn";

type PageShellProps = {
  title: string;
  subtitle?: string;
  breadcrumbs?: Array<{ label: string; href?: string }>;
  children: ReactNode;
  className?: string;
};

export function PageShell({ title, subtitle, breadcrumbs, children, className }: PageShellProps) {
  return (
    <main id="main-content" tabIndex={-1} className={cn("container-grid py-6", className)}>
      <header className="mb-6">
        {breadcrumbs ? <Breadcrumbs items={breadcrumbs} /> : null}
        <h1 className="type-h2 text-text-primary">{title}</h1>
        {subtitle ? <p className="type-body mt-2 text-text-secondary">{subtitle}</p> : null}
      </header>
      {children}
    </main>
  );
}
