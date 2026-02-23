"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MapPin, User, Users, Video } from "lucide-react";
import { PageShell } from "@/components/layout/page-shell";
import { EmptyState } from "@/components/patterns";
import { Card } from "@/components/primitives";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ProblemDetailsPanel } from "@/components/problem-details";
import { requestHal, type ProblemDetails } from "@/lib/hal-client";
import { buildOfferListHref, type AudienceFilter, type DeliveryModeFilter } from "@/lib/service-catalog-ui";

type Offer = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  audience: "INDIVIDUAL" | "GROUP" | "BOTH";
  delivery_mode: "ONLINE" | "IN_PERSON" | "HYBRID";
  status: "ACTIVE" | "INACTIVE";
  booking_url: string;
  outcomes: string[];
};

type OffersResponse = {
  count: number;
  items: Offer[];
};

const iconForOffer = (offer: Pick<Offer, "audience" | "delivery_mode">) => {
  if (offer.delivery_mode === "ONLINE") {
    return Video;
  }
  if (offer.audience === "GROUP") {
    return Users;
  }
  if (offer.audience === "INDIVIDUAL") {
    return User;
  }
  return MapPin;
};

const groupLabel = (audience: Offer["audience"]) => {
  if (audience === "INDIVIDUAL") return "Individual";
  if (audience === "GROUP") return "Teams";
  return "Individual + Teams";
};

export default function ServicesPageClient() {
  const [q, setQ] = useState("");
  const [audience, setAudience] = useState<AudienceFilter>("all");
  const [deliveryMode, setDeliveryMode] = useState<DeliveryModeFilter>("all");
  const [offers, setOffers] = useState<Offer[]>([]);
  const [pending, setPending] = useState(true);
  const [problem, setProblem] = useState<ProblemDetails | null>(null);

  useEffect(() => {
    const load = async () => {
      setPending(true);
      const href = buildOfferListHref({ q, audience, deliveryMode });
      const response = await requestHal<OffersResponse>(href);

      if (!response.ok) {
        setProblem(response.problem);
        setPending(false);
        return;
      }

      setProblem(null);
      setOffers(response.data.items ?? []);
      setPending(false);
    };

    void load();
  }, [q, audience, deliveryMode]);

  return (
    <PageShell title="Services" subtitle="Consulting and training offerings for individuals and teams.">
      <Card className="p-4">
        <h2 className="type-title">Find the right offer</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="services-search">Search</Label>
            <Input
              id="services-search"
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder="Search services"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="services-audience">Audience</Label>
            <Select value={audience} onValueChange={(value) => setAudience(value as AudienceFilter)}>
              <SelectTrigger id="services-audience" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="INDIVIDUAL">Individual</SelectItem>
                <SelectItem value="GROUP">Group</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="services-delivery">Delivery mode</Label>
            <Select value={deliveryMode} onValueChange={(value) => setDeliveryMode(value as DeliveryModeFilter)}>
              <SelectTrigger id="services-delivery" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="ONLINE">Online</SelectItem>
                <SelectItem value="IN_PERSON">In person</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {problem ? (
        <div className="mt-4">
          <ProblemDetailsPanel problem={problem} />
        </div>
      ) : null}

      <section className="mt-4 space-y-3">
        {pending ? (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <Card key={index} className="p-4">
                <div className="flex items-start gap-3">
                  <Skeleton className="h-10 w-10 rounded-sm" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-5/6" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : null}

        {!pending && !problem && offers.length === 0 ? (
          <EmptyState title="No services found" description="Try broadening your audience or delivery mode filters." />
        ) : null}

        {!pending && !problem ? (
          (Object.entries(
            offers.reduce<Record<string, Offer[]>>((acc, offer) => {
              const key = offer.audience;
              acc[key] = acc[key] ?? [];
              acc[key].push(offer);
              return acc;
            }, {}),
          ) as Array<[Offer["audience"], Offer[]]>).map(([audienceKey, grouped]) => (
            <div key={audienceKey} className="space-y-3">
              <h2 className="type-title">{groupLabel(audienceKey)}</h2>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {grouped.map((offer) => {
                  const Icon = iconForOffer(offer);
                  return (
                    <Card key={offer.id} className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 gap-3">
                          <div className="mt-0.5 inline-flex size-10 items-center justify-center rounded-sm border border-border-default">
                            <Icon className="size-5 text-text-secondary" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="type-title text-text-primary">{offer.title}</h3>
                            <p className="mt-1 type-body-sm text-text-secondary">{offer.summary}</p>
                            <p className="mt-2 type-meta text-text-muted">
                              Audience: {offer.audience} · Delivery: {offer.delivery_mode}
                            </p>
                          </div>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-2">
                          <Link className="type-label underline" href={`/services/${offer.slug}`} prefetch>
                            Learn more
                          </Link>
                          <Link className="type-label underline" href="/services/request" prefetch>
                            Request
                          </Link>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))
        ) : null}
      </section>
    </PageShell>
  );
}
