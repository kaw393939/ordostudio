import Link from "next/link";

import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/primitives/button";
import { Card } from "@/components/primitives";
import { Badge } from "@/components/ui/badge";
import { buildMetadata, BOOKING_URL } from "@/lib/metadata";
import { listApprovedApprentices } from "@/lib/api/apprentices";

export const metadata = buildMetadata({
  title: "Apprentices",
  description: "Approved Studio Ordo apprentices (independent AI consultants) affiliated with Studio Ordo.",
  canonical: "/apprentices",
});

const parseTags = (raw: string): string[] => {
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t.length > 0)
    .slice(0, 8);
};

export default function ApprenticesDirectoryPage() {
  const items = listApprovedApprentices();

  return (
    <PageShell
      title="Apprentices"
      subtitle="Independent consultants affiliated with Studio Ordo. Standardized offers. Maestro supervision."
    >
      <div className="mb-8 surface-elevated p-6 text-center rounded-lg border border-border-subtle">
        <h2 className="type-title text-text-primary mb-2">Looking for specialized AI talent?</h2>
        <p className="type-body-sm text-text-secondary mb-4">
          Our apprentices are independent consultants trained in the Studio Ordo method. We can help match you with the right expert for your project.
        </p>
        <Button asChild intent="primary">
          <Link href={BOOKING_URL}>Get Matched</Link>
        </Button>
      </div>

      {items.length === 0 ? (
        <Card className="p-6">
          <p className="type-body-sm text-text-secondary">No apprentices are listed yet.</p>
        </Card>
      ) : (
        <section className="grid gap-3 lg:grid-cols-2">
          {items.map((item) => {
            const tags = parseTags(item.tags);
            return (
              <Card key={item.handle} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="type-title text-text-primary">
                      <Link href={`/apprentices/${item.handle}`} className="underline">
                        {item.display_name}
                      </Link>
                    </h2>
                    {item.headline ? <p className="mt-1 type-body-sm text-text-secondary">{item.headline}</p> : null}
                    {item.location ? <p className="mt-1 type-meta text-text-muted">{item.location}</p> : null}
                  </div>
                </div>

                {tags.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <Badge key={tag} variant="outline">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                ) : null}

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <Link href={`/apprentices/${item.handle}`} className="type-label underline">
                    View profile
                  </Link>
                  {item.website_url ? (
                    <a className="type-label underline" href={item.website_url} target="_blank" rel="noreferrer">
                      Website
                    </a>
                  ) : null}
                </div>
              </Card>
            );
          })}
        </section>
      )}
    </PageShell>
  );
}
