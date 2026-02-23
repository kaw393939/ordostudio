"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { PageShell } from "@/components/layout/page-shell";
import { Button, Card } from "@/components/primitives";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProblemDetailsPanel } from "@/components/problem-details";
import { requestHal, type ProblemDetails } from "@/lib/hal-client";
import { outcomesToLines, parseOutcomeLines } from "@/lib/service-catalog-ui";
import { getCurrency } from "@/platform/locale";

type OfferPackage = {
  id: string;
  name: string;
  scope: string;
  price_label: string;
  sort_order: number;
};

type OfferDetail = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  price_cents: number | null;
  currency: string;
  duration_label: string;
  refund_policy_key: string;
  audience: "INDIVIDUAL" | "GROUP" | "BOTH";
  delivery_mode: "ONLINE" | "IN_PERSON" | "HYBRID";
  status: "ACTIVE" | "INACTIVE";
  booking_url: string;
  outcomes: string[];
  packages: OfferPackage[];
};

export default function AdminOfferDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const [offer, setOffer] = useState<OfferDetail | null>(null);
  const [pending, setPending] = useState(false);
  const [problem, setProblem] = useState<ProblemDetails | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [offerForm, setOfferForm] = useState({
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
    status: "ACTIVE" as "ACTIVE" | "INACTIVE",
  });

  const [confirmPriceChange, setConfirmPriceChange] = useState(false);

  const [packageForm, setPackageForm] = useState({
    name: "",
    scope: "",
    price_label: "",
    sort_order: "100",
  });

  const [deleteOfferOpen, setDeleteOfferOpen] = useState(false);
  const [editPackageOpen, setEditPackageOpen] = useState(false);
  const [packageDraft, setPackageDraft] = useState<{ id: string; name: string; scope: string; price_label: string; sort_order: number } | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!slug) {
        return;
      }

      setPending(true);
      const response = await requestHal<OfferDetail>(`/api/v1/offers/${slug}`);
      if (!response.ok) {
        setProblem(response.problem);
        setPending(false);
        return;
      }

      const next = response.data;
      setOffer(next);
      setOfferForm({
        title: next.title,
        summary: next.summary,
        price_cents: next.price_cents ? String(next.price_cents) : "",
        currency: next.currency,
        duration_label: next.duration_label,
        refund_policy_key: next.refund_policy_key,
        audience: next.audience,
        delivery_mode: next.delivery_mode,
        booking_url: next.booking_url,
        outcomes: outcomesToLines(next.outcomes),
        status: next.status,
      });
      setConfirmPriceChange(false);
      setProblem(null);
      setPending(false);
    };

    void load();
  }, [slug, refreshKey]);

  const onSaveOffer = async () => {
    if (!slug) {
      return;
    }

    setPending(true);
    setProblem(null);

    const response = await requestHal<unknown>(`/api/v1/offers/${slug}`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        title: offerForm.title,
        summary: offerForm.summary,
        price_cents: offerForm.price_cents.length > 0 ? Number(offerForm.price_cents) : null,
        currency: offerForm.currency,
        duration_label: offerForm.duration_label,
        refund_policy_key: offerForm.refund_policy_key,
        audience: offerForm.audience,
        delivery_mode: offerForm.delivery_mode,
        booking_url: offerForm.booking_url,
        outcomes: parseOutcomeLines(offerForm.outcomes),
        status: offerForm.status,
        confirm_price_change: confirmPriceChange,
      }),
    });

    if (!response.ok) {
      setProblem(response.problem);
      setPending(false);
      return;
    }

    setRefreshKey((current) => current + 1);
    setConfirmPriceChange(false);
    setPending(false);
  };

  const onCreatePackage = async () => {
    if (!slug) {
      return;
    }

    setPending(true);
    setProblem(null);

    const response = await requestHal<unknown>(`/api/v1/offers/${slug}/packages`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        name: packageForm.name,
        scope: packageForm.scope,
        price_label: packageForm.price_label,
        sort_order: Number(packageForm.sort_order),
      }),
    });

    if (!response.ok) {
      setProblem(response.problem);
      setPending(false);
      return;
    }

    setPackageForm({ name: "", scope: "", price_label: "", sort_order: "100" });
    setRefreshKey((current) => current + 1);
    setPending(false);
  };

  const onDeletePackage = async (packageId: string) => {
    if (!slug) {
      return;
    }

    setPending(true);
    setProblem(null);

    const response = await requestHal<unknown>(`/api/v1/offers/${slug}/packages/${packageId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      setProblem(response.problem);
      setPending(false);
      return;
    }

    setRefreshKey((current) => current + 1);
    setPending(false);
  };

  const onEditPackage = async (item: OfferPackage) => {
    if (!slug) {
      return;
    }

    setPackageDraft({
      id: item.id,
      name: item.name,
      scope: item.scope,
      price_label: item.price_label,
      sort_order: item.sort_order,
    });
    setEditPackageOpen(true);
  };

  const onConfirmEditPackage = async () => {
    if (!slug || !packageDraft) {
      return;
    }

    setPending(true);
    setProblem(null);

    const response = await requestHal<unknown>(`/api/v1/offers/${slug}/packages/${packageDraft.id}`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        name: packageDraft.name,
        scope: packageDraft.scope,
        price_label: packageDraft.price_label,
        sort_order: packageDraft.sort_order,
      }),
    });

    if (!response.ok) {
      setProblem(response.problem);
      setPending(false);
      return;
    }

    setEditPackageOpen(false);
    setPackageDraft(null);
    setRefreshKey((current) => current + 1);
    setPending(false);
  };

  const onDeleteOffer = async () => {
    if (!slug) {
      return;
    }

    setPending(true);
    setProblem(null);

    const response = await requestHal<unknown>(`/api/v1/offers/${slug}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      setProblem(response.problem);
      setPending(false);
      return;
    }

    window.location.assign("/admin/offers");
  };

  return (
    <PageShell title={offer ? `Manage offer: ${offer.title}` : "Manage offer"} subtitle="Update offer details and package structure.">
      {problem ? (
        <div className="mb-4">
          <ProblemDetailsPanel problem={problem} />
        </div>
      ) : null}

      <Card className="p-4">
        <h2 className="type-title">Offer details</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="offer-detail-title">Title</Label>
            <Input id="offer-detail-title" value={offerForm.title} onChange={(event) => setOfferForm((prev) => ({ ...prev, title: event.target.value }))} placeholder="Offer title" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="offer-detail-url">Booking URL</Label>
            <Input id="offer-detail-url" value={offerForm.booking_url} onChange={(event) => setOfferForm((prev) => ({ ...prev, booking_url: event.target.value }))} placeholder="e.g., https://calendly.com/..." />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="offer-detail-summary">Summary</Label>
            <Input id="offer-detail-summary" value={offerForm.summary} onChange={(event) => setOfferForm((prev) => ({ ...prev, summary: event.target.value }))} placeholder="Brief description" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="offer-detail-price">Price (cents)</Label>
            <Input
              id="offer-detail-price"
              inputMode="numeric"
              value={offerForm.price_cents}
              onChange={(event) => setOfferForm((prev) => ({ ...prev, price_cents: event.target.value }))}
              placeholder="e.g., 25000"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="offer-detail-currency">Currency</Label>
            <Input id="offer-detail-currency" value={offerForm.currency} onChange={(event) => setOfferForm((prev) => ({ ...prev, currency: event.target.value }))} placeholder="e.g., USD" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="offer-detail-duration">Duration label</Label>
            <Input
              id="offer-detail-duration"
              value={offerForm.duration_label}
              onChange={(event) => setOfferForm((prev) => ({ ...prev, duration_label: event.target.value }))}
              placeholder="e.g., 60 minutes"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="offer-detail-refund">Refund policy key</Label>
            <Input
              id="offer-detail-refund"
              value={offerForm.refund_policy_key}
              onChange={(event) => setOfferForm((prev) => ({ ...prev, refund_policy_key: event.target.value }))}
              placeholder="e.g., standard"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="offer-detail-audience">Audience</Label>
            <Select
              value={offerForm.audience}
              onValueChange={(value) => setOfferForm((prev) => ({ ...prev, audience: value as "INDIVIDUAL" | "GROUP" | "BOTH" }))}
            >
              <SelectTrigger id="offer-detail-audience" className="w-full">
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
            <Label htmlFor="offer-detail-delivery">Delivery mode</Label>
            <Select
              value={offerForm.delivery_mode}
              onValueChange={(value) => setOfferForm((prev) => ({ ...prev, delivery_mode: value as "ONLINE" | "IN_PERSON" | "HYBRID" }))}
            >
              <SelectTrigger id="offer-detail-delivery" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="HYBRID">Hybrid</SelectItem>
                <SelectItem value="ONLINE">Online</SelectItem>
                <SelectItem value="IN_PERSON">In person</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="offer-detail-status">Status</Label>
            <Select
              value={offerForm.status}
              onValueChange={(value) => setOfferForm((prev) => ({ ...prev, status: value as "ACTIVE" | "INACTIVE" }))}
            >
              <SelectTrigger id="offer-detail-status" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <input
            id="offer-detail-confirm-price"
            type="checkbox"
            className="h-4 w-4"
            checked={confirmPriceChange}
            onChange={(event) => setConfirmPriceChange(event.target.checked)}
            disabled={pending}
          />
          <Label htmlFor="offer-detail-confirm-price">Confirm price change (required when editing price)</Label>
        </div>

        <div className="mt-3 space-y-1.5">
          <Label htmlFor="offer-detail-outcomes">Outcomes (one per line)</Label>
          <Textarea
            id="offer-detail-outcomes"
            value={offerForm.outcomes}
            onChange={(event) => setOfferForm((prev) => ({ ...prev, outcomes: event.target.value }))}
            className="min-h-24"
          />
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <Button intent="primary" onClick={() => void onSaveOffer()} disabled={pending}>
            {pending ? "Saving..." : "Save offer"}
          </Button>
          <Button intent="danger" onClick={() => setDeleteOfferOpen(true)} disabled={pending}>
            Delete offer
          </Button>
        </div>
      </Card>

      <AlertDialog
        open={editPackageOpen}
        onOpenChange={(open) => {
          setEditPackageOpen(open);
          if (!open) {
            setPackageDraft(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Edit package</AlertDialogTitle>
            <AlertDialogDescription>Update the package fields, then save your changes.</AlertDialogDescription>
          </AlertDialogHeader>

          {packageDraft ? (
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="pkg-name">Name</Label>
                <Input id="pkg-name" value={packageDraft.name} onChange={(e) => setPackageDraft((prev) => (prev ? { ...prev, name: e.target.value } : prev))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pkg-price">Price label</Label>
                <Input
                  id="pkg-price"
                  value={packageDraft.price_label}
                  onChange={(e) => setPackageDraft((prev) => (prev ? { ...prev, price_label: e.target.value } : prev))}
                />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="pkg-scope">Scope</Label>
                <Input id="pkg-scope" value={packageDraft.scope} onChange={(e) => setPackageDraft((prev) => (prev ? { ...prev, scope: e.target.value } : prev))} />
              </div>
            </div>
          ) : null}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={pending || !packageDraft} onClick={() => void onConfirmEditPackage()}>
              {pending ? "Saving..." : "Save package"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteOfferOpen} onOpenChange={setDeleteOfferOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete offer</AlertDialogTitle>
            <AlertDialogDescription>This deletes the offer and all packages. This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={pending}
              onClick={() => {
                setDeleteOfferOpen(false);
                void onDeleteOffer();
              }}
            >
              {pending ? "Deleting..." : "Delete offer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card className="mt-4 p-4">
        <h2 className="type-title">Packages</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="pkg-name">Package name</Label>
            <Input id="pkg-name" value={packageForm.name} onChange={(event) => setPackageForm((prev) => ({ ...prev, name: event.target.value }))} placeholder="e.g., Starter" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pkg-price">Price label</Label>
            <Input id="pkg-price" value={packageForm.price_label} onChange={(event) => setPackageForm((prev) => ({ ...prev, price_label: event.target.value }))} placeholder="e.g., $500/month" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pkg-scope">Scope</Label>
            <Input id="pkg-scope" value={packageForm.scope} onChange={(event) => setPackageForm((prev) => ({ ...prev, scope: event.target.value }))} placeholder="e.g., 4 sessions" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pkg-sort">Sort order</Label>
            <Input id="pkg-sort" value={packageForm.sort_order} onChange={(event) => setPackageForm((prev) => ({ ...prev, sort_order: event.target.value }))} placeholder="e.g., 1" />
          </div>
        </div>

        <Button intent="primary" className="mt-3" onClick={() => void onCreatePackage()} disabled={pending}>
          {pending ? "Saving..." : "Add package"}
        </Button>

        <ul className="mt-4 space-y-2">
          {offer?.packages.map((item) => (
            <li key={item.id} className="rounded-sm border border-border-default p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="type-label">{item.name}</p>
                  <p className="type-meta text-text-muted">{item.scope}</p>
                  <p className="type-meta text-text-muted">{item.price_label}</p>
                </div>
                  <div className="flex items-center gap-2">
                    <Button intent="secondary" size="sm" onClick={() => void onEditPackage(item)} disabled={pending}>
                      Edit
                    </Button>
                    <Button intent="danger" size="sm" onClick={() => void onDeletePackage(item.id)} disabled={pending}>
                      Remove
                    </Button>
                  </div>
              </div>
            </li>
          ))}
          {offer && offer.packages.length === 0 ? <li className="type-body-sm text-text-secondary">No packages yet.</li> : null}
        </ul>
      </Card>
    </PageShell>
  );
}
