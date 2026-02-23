"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { PageShell } from "@/components/layout/page-shell";
import { Card } from "@/components/primitives";
import { ProblemDetailsPanel } from "@/components/problem-details";
import { requestHal, type ProblemDetails } from "@/lib/hal-client";

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
  audience: "INDIVIDUAL" | "GROUP" | "BOTH";
  delivery_mode: "ONLINE" | "IN_PERSON" | "HYBRID";
  booking_url: string;
  outcomes: string[];
  packages: OfferPackage[];
};

export default function ServiceDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const [offer, setOffer] = useState<OfferDetail | null>(null);
  const [pending, setPending] = useState(true);
  const [problem, setProblem] = useState<ProblemDetails | null>(null);

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

      setProblem(null);
      setOffer(response.data);
      setPending(false);
    };

    void load();
  }, [slug]);

  return (
    <PageShell title={offer?.title ?? "Service details"} subtitle={offer?.summary ?? "Review scope, outcomes, and package options."}>
      {pending ? <Card className="p-4 type-body-sm text-text-secondary">Loading offer details...</Card> : null}

      {problem ? (
        <div className="mt-4">
          <ProblemDetailsPanel problem={problem} />
        </div>
      ) : null}

      {offer ? (
        <>
          <Card className="p-4">
            <h2 className="type-title">Offer profile</h2>
            <p className="mt-2 type-body-sm text-text-secondary">
              Audience: {offer.audience} · Delivery mode: {offer.delivery_mode}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Link
                href={`/services/request?offer=${offer.slug}`}
                data-measure-key="CTA_CLICK_BOOK_TECHNICAL_CONSULT"
                className="inline-flex rounded-sm border border-action-primary bg-action-primary px-3 py-2 type-label text-text-inverse hover:bg-action-primary-hover"
              >
                Request booking
              </Link>
              <a href={offer.booking_url} className="inline-flex rounded-sm border border-border-default bg-action-secondary px-3 py-2 type-label text-text-primary hover:bg-action-secondary-hover">
                External booking link
              </a>
            </div>
          </Card>

          <Card className="mt-4 p-4">
            <h2 className="type-title">Outcomes</h2>
            {offer.outcomes.length > 0 ? (
              <ul className="mt-2 list-disc pl-5 type-body-sm text-text-secondary">
                {offer.outcomes.map((outcome) => (
                  <li key={outcome}>{outcome}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 type-body-sm text-text-secondary">Outcomes will be confirmed during discovery.</p>
            )}
          </Card>

          <Card className="mt-4 p-4">
            <h2 className="type-title">Package comparison</h2>
            {offer.packages.length > 0 ? (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-left type-body-sm">
                  <thead>
                    <tr>
                      <th className="pb-2">Package</th>
                      <th className="pb-2">Scope</th>
                      <th className="pb-2">Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {offer.packages.map((item) => (
                      <tr key={item.id} className="border-t border-border-default align-top">
                        <td className="py-2 type-label">{item.name}</td>
                        <td className="py-2 text-text-secondary">{item.scope}</td>
                        <td className="py-2">{item.price_label}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="mt-2 type-body-sm text-text-secondary">Package options are being finalized.</p>
            )}
          </Card>
        </>
      ) : null}
    </PageShell>
  );
}
