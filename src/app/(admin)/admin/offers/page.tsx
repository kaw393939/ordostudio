"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PageShell } from "@/components/layout/page-shell";
import { Button, Card } from "@/components/primitives";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProblemDetailsPanel } from "@/components/problem-details";
import { Badge } from "@/components/ui/badge";
import { requestHal, type ProblemDetails } from "@/lib/hal-client";
import { buildOfferListHref, parseOutcomeLines } from "@/lib/service-catalog-ui";
import { getCurrency } from "@/platform/locale";

type Offer = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  audience: "INDIVIDUAL" | "GROUP" | "BOTH";
  delivery_mode: "ONLINE" | "IN_PERSON" | "HYBRID";
  status: "ACTIVE" | "INACTIVE";
};

type OffersResponse = {
  count: number;
  items: Offer[];
};

export default function AdminOffersPage() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [pending, setPending] = useState(false);
  const [problem, setProblem] = useState<ProblemDetails | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [focusedSlug, setFocusedSlug] = useState<string | null>(null);

  const [form, setForm] = useState({
    slug: "",
    title: "",
    summary: "",
    price_cents: "",
    currency: getCurrency() as string,
    duration_label: "",
    refund_policy_key: "standard",
    audience: "BOTH" as "INDIVIDUAL" | "GROUP" | "BOTH",
    delivery_mode: "HYBRID" as "ONLINE" | "IN_PERSON" | "HYBRID",
    booking_url: "",
    outcomes: "",
  });

  useEffect(() => {
    const load = async () => {
      setPending(true);
      const response = await requestHal<OffersResponse>(
        buildOfferListHref({ q: "", audience: "all", deliveryMode: "all", includeInactive: true }),
      );

      if (!response.ok) {
        setProblem(response.problem);
        setPending(false);
        return;
      }

      setProblem(null);
      setOffers(response.data.items ?? []);
      setFocusedSlug((current) => {
        const next = response.data.items ?? [];
        if (!current) return next.length > 0 ? next[0].slug : null;
        return next.some((row) => row.slug === current) ? current : (next.length > 0 ? next[0].slug : null);
      });
      setPending(false);
    };

    void load();
  }, [refreshKey]);

  const onCreate = async () => {
    setPending(true);
    setProblem(null);

    const response = await requestHal<unknown>("/api/v1/offers", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        slug: form.slug,
        title: form.title,
        summary: form.summary,
        price_cents: Number(form.price_cents),
        currency: form.currency,
        duration_label: form.duration_label,
        refund_policy_key: form.refund_policy_key,
        audience: form.audience,
        delivery_mode: form.delivery_mode,
        booking_url: form.booking_url,
        outcomes: parseOutcomeLines(form.outcomes),
        status: "ACTIVE",
      }),
    });

    if (!response.ok) {
      setProblem(response.problem);
      setPending(false);
      return;
    }

    setForm({
      slug: "",
      title: "",
      summary: "",
      price_cents: "",
      currency: getCurrency() as string,
      duration_label: "",
      refund_policy_key: "standard",
      audience: "BOTH",
      delivery_mode: "HYBRID",
      booking_url: "",
      outcomes: "",
    });
    setRefreshKey((current) => current + 1);
    setPending(false);
  };

  const onSetStatus = async (slug: string, status: "ACTIVE" | "INACTIVE") => {
    setPending(true);
    setProblem(null);

    const response = await requestHal<unknown>(`/api/v1/offers/${slug}`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ status }),
    });

    if (!response.ok) {
      setProblem(response.problem);
      setPending(false);
      return;
    }

    setRefreshKey((current) => current + 1);
    setPending(false);
  };

  const focused = useMemo(() => {
    if (!focusedSlug) return null;
    return offers.find((offer) => offer.slug === focusedSlug) ?? null;
  }, [focusedSlug, offers]);

  return (
    <PageShell
      title="Services"
      subtitle="Create and maintain consulting/training service offerings."
      breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Services" }]}
    >
      <Card className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="type-title">Work queue</h2>
            <p className="mt-1 type-meta text-text-muted">Step 1: pick an offer. Step 2: manage packages or status.</p>
          </div>
          <Button intent="secondary" onClick={() => setRefreshKey((current) => current + 1)} disabled={pending}>
            Refresh
          </Button>
        </div>
      </Card>

      {problem ? (
        <div className="mt-4">
          <ProblemDetailsPanel problem={problem} />
        </div>
      ) : null}

      <div className="mt-4 grid gap-4 lg:grid-cols-[22rem,1fr]">
        <Card className="p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="type-title">Queue</h2>
              <p className="mt-1 type-meta text-text-muted">Offers ({offers.length})</p>
            </div>
            <Badge variant="outline">{offers.length}</Badge>
          </div>

          {offers.length === 0 && !pending ? <p className="mt-3 type-meta text-text-muted">No offers found.</p> : null}

          {offers.length > 0 ? (
            <ul className="mt-3 space-y-2">
              {offers.map((offer) => (
                <li
                  key={offer.id}
                  className={
                    focusedSlug === offer.slug
                      ? "rounded-sm border border-border-default bg-action-secondary/30 p-3"
                      : "rounded-sm border border-border-default p-3"
                  }
                >
                  <button
                    type="button"
                    className="w-full text-left"
                    aria-current={focusedSlug === offer.slug ? "true" : undefined}
                    onClick={() => setFocusedSlug(offer.slug)}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="type-label text-text-primary line-clamp-1">{offer.title}</p>
                      <Badge variant={offer.status === "ACTIVE" ? "secondary" : "outline"}>{offer.status}</Badge>
                    </div>
                    <p className="mt-1 type-meta text-text-muted">
                      {offer.slug} · {offer.audience} · {offer.delivery_mode}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </Card>

        <Card className="p-4">
          <h2 className="type-title">Offer</h2>

          {focused ? (
            <div className="mt-3 space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="type-label text-text-primary">{focused.title}</p>
                  <p className="mt-1 type-meta text-text-muted">{focused.slug}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={focused.status === "ACTIVE" ? "secondary" : "outline"}>{focused.status}</Badge>
                  <Link href={`/admin/offers/${focused.slug}`} className="type-label underline" prefetch>
                    Manage packages
                  </Link>
                </div>
              </div>

              <div className="surface rounded-sm border border-border-default p-3">
                <p className="type-meta text-text-muted">Summary</p>
                <p className="mt-1 type-body-sm text-text-secondary whitespace-pre-wrap">{focused.summary}</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  intent="primary"
                  onClick={() => void onSetStatus(focused.slug, focused.status === "ACTIVE" ? "INACTIVE" : "ACTIVE")}
                  disabled={pending}
                >
                  {focused.status === "ACTIVE" ? "Deactivate" : "Activate"}
                </Button>
              </div>

              <details className="surface rounded-sm border border-border-default p-3">
                <summary className="cursor-pointer type-label text-text-primary">Create offer</summary>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="offer-slug">Slug</Label>
                    <Input id="offer-slug" placeholder="e.g., leadership-coaching" value={form.slug} onChange={(event) => setForm((prev) => ({ ...prev, slug: event.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="offer-title">Title</Label>
                    <Input id="offer-title" placeholder="e.g., Leadership Coaching" value={form.title} onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="offer-summary">Summary</Label>
                    <Input id="offer-summary" placeholder="Brief description of the offer" value={form.summary} onChange={(event) => setForm((prev) => ({ ...prev, summary: event.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="offer-price">Price (cents)</Label>
                    <Input
                      id="offer-price"
                      inputMode="numeric"
                      placeholder="e.g., 25000"
                      value={form.price_cents}
                      onChange={(event) => setForm((prev) => ({ ...prev, price_cents: event.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="offer-currency">Currency</Label>
                    <Input
                      id="offer-currency"
                      placeholder="e.g., USD"
                      value={form.currency}
                      onChange={(event) => setForm((prev) => ({ ...prev, currency: event.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="offer-duration">Duration label</Label>
                    <Input
                      id="offer-duration"
                      placeholder="e.g., 60 minutes"
                      value={form.duration_label}
                      onChange={(event) => setForm((prev) => ({ ...prev, duration_label: event.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="offer-refund">Refund policy key</Label>
                    <Input
                      id="offer-refund"
                      placeholder="e.g., standard"
                      value={form.refund_policy_key}
                      onChange={(event) => setForm((prev) => ({ ...prev, refund_policy_key: event.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="offer-booking-url">Booking URL</Label>
                    <Input id="offer-booking-url" placeholder="e.g., https://calendly.com/..." value={form.booking_url} onChange={(event) => setForm((prev) => ({ ...prev, booking_url: event.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="offer-audience">Audience</Label>
                    <Select
                      value={form.audience}
                      onValueChange={(value) => setForm((prev) => ({ ...prev, audience: value as "INDIVIDUAL" | "GROUP" | "BOTH" }))}
                    >
                      <SelectTrigger id="offer-audience" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BOTH">Both</SelectItem>
                        <SelectItem value="INDIVIDUAL">Individual</SelectItem>
                        <SelectItem value="GROUP">Group</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="offer-delivery">Delivery mode</Label>
                    <Select
                      value={form.delivery_mode}
                      onValueChange={(value) => setForm((prev) => ({ ...prev, delivery_mode: value as "ONLINE" | "IN_PERSON" | "HYBRID" }))}
                    >
                      <SelectTrigger id="offer-delivery" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="HYBRID">Hybrid</SelectItem>
                        <SelectItem value="ONLINE">Online</SelectItem>
                        <SelectItem value="IN_PERSON">In person</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="mt-3 space-y-1.5">
                  <Label htmlFor="offer-outcomes">Outcomes (one per line)</Label>
                  <Textarea
                    id="offer-outcomes"
                    value={form.outcomes}
                    onChange={(event) => setForm((prev) => ({ ...prev, outcomes: event.target.value }))}
                    className="min-h-24"
                  />
                </div>

                <Button intent="secondary" className="mt-3" onClick={() => void onCreate()} disabled={pending}>
                  {pending ? "Saving..." : "Create offer"}
                </Button>
              </details>
            </div>
          ) : (
            <p className="mt-3 type-body-sm text-text-secondary">Step 2: choose an offer from the queue.</p>
          )}
        </Card>
      </div>
    </PageShell>
  );
}
