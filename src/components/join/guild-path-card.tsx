import Link from "next/link";
import { Button } from "@/components/primitives/button";
import { Card } from "@/components/primitives/card";
import { Badge } from "@/components/ui/badge";

export type GuildPathCardProps = {
  title: string;
  badge: string;
  description: string;
  bullets: string[];
  pathKey: string;
  ctaHref: string;
  ctaLabel?: string;
  authorityLine?: string;
  urgencyNote?: string;
};

export function GuildPathCard({
  title,
  badge,
  description,
  bullets,
  ctaHref,
  ctaLabel = "Book a Path Consult →",
  authorityLine,
  urgencyNote,
}: GuildPathCardProps) {
  const metaLine = authorityLine ?? urgencyNote ?? null;

  return (
    <Card className="flex flex-col gap-3 p-5">
      <Badge variant="secondary">{badge}</Badge>
      <h3 className="type-title text-text-primary">{title}</h3>
      <p className="type-body-sm text-text-secondary">{description}</p>
      <ul className="space-y-1">
        {bullets.map((b) => (
          <li key={b} className="flex gap-2 type-body-sm text-text-secondary">
            <span aria-hidden="true">✔</span>
            <span>{b}</span>
          </li>
        ))}
      </ul>
      {metaLine ? <p className="type-meta text-text-muted">{metaLine}</p> : null}
      <div className="mt-auto pt-2">
        <Button asChild intent="primary">
          <Link href={ctaHref}>{ctaLabel}</Link>
        </Button>
      </div>
    </Card>
  );
}
