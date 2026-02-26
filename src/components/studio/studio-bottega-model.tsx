import { Card } from "@/components/primitives";
import { Badge } from "@/components/ui/badge";

export function StudioBottegaModel() {
  const roles = [
    {
      title: "The Maestro",
      badge: "Vision & Quality",
      description: "Sets the architectural vision, defines the 'Double Stripping' thesis, and acts as the final quality gate. Secures commissions but does not manage daily trainee execution.",
    },
    {
      title: "The Journeyman",
      badge: "Operations & Management",
      description: "The operational bridge. Manages commissions, oversees agentic output, and directly supervises the Apprentices to ensure the Maestro's vision is executed flawlessly.",
    },
    {
      title: "The Apprentice",
      badge: "Independent Contractor",
      description: "Graduates of the 90-day program who have proven their capability. They are assigned overflow work from commissions and execute the 40/60 split under the Journeyman's supervision.",
    },
    {
      title: "The Affiliate",
      badge: "15-20% Commission",
      description: "The decentralized sales force (often former students). They generate leads (e.g., at NYC AI meetups) and take a high commission on closed Studio Ordo contracts.",
    },
  ];

  return (
    <section className="surface p-6">
      <p className="type-meta text-text-muted">The Hierarchy</p>
      <h2 className="mt-2 type-title text-text-primary">The Bottega Model</h2>
      <p className="mt-2 type-body-sm text-text-secondary">
        Studio Ordo operates as a decentralized guild, not a traditional agency or bootcamp. We have <strong>zero obligation</strong> to hire or place our students. Graduates are independent contractors.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {roles.map((role, index) => (
          <Card key={role.title} className="relative p-5">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-muted type-meta text-text-primary">
                {index + 1}
              </span>
              <Badge variant="secondary">{role.badge}</Badge>
            </div>
            <h3 className="mt-3 type-label text-text-primary">{role.title}</h3>
            <p className="mt-1 type-body-sm text-text-secondary">{role.description}</p>
          </Card>
        ))}
      </div>
    </section>
  );
}
