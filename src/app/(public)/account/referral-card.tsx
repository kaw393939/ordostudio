"use client";

import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";

import { Card, Button } from "@/components/primitives";
import { ProblemDetailsPanel } from "@/components/problem-details";
import { requestHal, type ProblemDetails } from "@/lib/hal-client";

type ReferralPayload = {
  code: string;
  url: string;
  commission_rate: number;
  disclosure: string;
};

export function ReferralCard() {
  const [pending, setPending] = useState(true);
  const [problem, setProblem] = useState<ProblemDetails | null>(null);
  const [referral, setReferral] = useState<ReferralPayload | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const absoluteUrl = useMemo(() => {
    if (!referral) return "";
    if (typeof window === "undefined") return referral.url;
    return new URL(referral.url, window.location.origin).toString();
  }, [referral]);

  useEffect(() => {
    let alive = true;

    void (async () => {
      const result = await requestHal<ReferralPayload>("/api/v1/account/referral");
      if (!alive) return;

      if (!result.ok) {
        setProblem(result.problem);
        setReferral(null);
        setPending(false);
        return;
      }

      setProblem(null);
      setReferral(result.data);
      setPending(false);
    })();

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;

    if (!absoluteUrl) {
      return;
    }

    void (async () => {
      try {
        const url = await QRCode.toDataURL(absoluteUrl, {
          margin: 1,
          width: 256,
          errorCorrectionLevel: "M",
        });
        if (!alive) return;
        setQrDataUrl(url);
      } catch {
        if (!alive) return;
        setQrDataUrl(null);
      }
    })();

    return () => {
      alive = false;
    };
  }, [absoluteUrl]);

  const onCopy = async () => {
    if (!absoluteUrl) return;
    try {
      await navigator.clipboard.writeText(absoluteUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  };

  if (pending) {
    return (
      <Card className="p-4">
        <p className="type-meta text-text-muted">Loading referral card…</p>
      </Card>
    );
  }

  if (problem) {
    return (
      <Card className="p-4">
        <ProblemDetailsPanel problem={problem} />
      </Card>
    );
  }

  if (!referral) {
    return (
      <Card className="p-4">
        <p className="type-body-sm text-text-secondary">Referral card unavailable.</p>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="type-meta text-text-muted">Referral code</p>
          <p className="mt-1 type-title text-text-primary">{referral.code}</p>

          <div className="mt-4">
            <p className="type-label text-text-primary">Referral URL</p>
            <p className="mt-1 break-all type-body-sm text-text-secondary">{absoluteUrl}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Button intent="secondary" type="button" onClick={() => void onCopy()}>
                {copied ? "Copied" : "Copy URL"}
              </Button>
              {qrDataUrl ? (
                <a
                  href={qrDataUrl}
                  download={`studio-ordo-referral-${referral.code}.png`}
                  className="motion-base rounded-sm border border-border-default bg-surface px-3 py-2 type-label text-text-primary hover:bg-surface-2"
                >
                  Download QR
                </a>
              ) : null}
              <Button intent="secondary" type="button" onClick={() => window.print()}>
                Print
              </Button>
            </div>
          </div>

          <div className="mt-4 grid gap-2">
            <p className="type-body-sm text-text-secondary">
              One sentence value: Refer a lead and earn {Math.round(referral.commission_rate * 100)}% commission when work is sold.
            </p>
            <p className="type-body-sm text-text-secondary">
              Disclosure: {referral.disclosure}
            </p>
          </div>
        </div>

        <div className="shrink-0">
          <p className="type-meta text-text-muted">QR code</p>
          <div className="mt-2 rounded-sm border border-border-default bg-surface p-3">
            {qrDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qrDataUrl} alt="Referral QR code" width={256} height={256} className="h-40 w-40" />
            ) : (
              <p className="type-meta text-text-muted">QR unavailable.</p>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
