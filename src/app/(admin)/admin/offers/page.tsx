"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PageShell } from "@/components/layout/page-shell";
import { Button, Card } from "@/components/primitives";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProblemDetailsPanel } from "@/components/problem-details";
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

  return (
    <PageShell
      title="Services"
      subtitle="Create and maintain consulting/training service offerings."
      breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Services" }]}
    >
      <Card className="p-4">
        <h2 className="type-title">Create offer</h2>
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

        <Button intent="primary" className="mt-3" onClick={() => void onCreate()} disabled={pending}>
          {pending ? "Saving..." : "Create offer"}
        </Button>
      </Card>

      {problem ? (
        <div className="mt-4">
          <ProblemDetailsPanel problem={problem} />
        </div>
      ) : null}

      <Card className="mt-4 p-4">
        <h2 className="type-title">Offers ({offers.length})</h2>
        <ul className="mt-3 space-y-2">
          {offers.map((offer) => (
            <li key={offer.id} className="rounded-sm border border-border-default p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="type-label">{offer.title}</p>
                  <p className="type-meta text-text-muted">{offer.slug} · {offer.audience} · {offer.delivery_mode} · {offer.status}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    intent="secondary"
                    onClick={() => void onSetStatus(offer.slug, offer.status === "ACTIVE" ? "INACTIVE" : "ACTIVE")}
                    disabled={pending}
                  >
                    {offer.status === "ACTIVE" ? "Deactivate" : "Activate"}
                  </Button>
                  <Link href={`/admin/offers/${offer.slug}`} className="type-label underline" prefetch>
                    Manage packages
                  </Link>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </PageShell>
  );
}
