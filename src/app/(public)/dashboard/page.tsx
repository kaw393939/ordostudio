"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ProblemDetailsPanel } from "@/components/problem-details";
import { EmptyState } from "@/components/patterns";
import { Card } from "@/components/primitives";
import { PageShell } from "@/components/layout/page-shell";
import { requestHal, type ProblemDetails } from "@/lib/hal-client";
import { ActionFeed } from "@/components/dashboard/action-feed";
import { ReferralCard } from "./referral-card";
import { OnboardingTaskList } from "@/components/dashboard/onboarding-task-list";
import { PayoutActivation } from "@/components/dashboard/payout-activation";

type MeResponse = {
  id: string;
  email: string;
  status: string;
  roles: string[];
  last_login_at: string | null;
  _links: Record<string, { href: string }>;
};

export default function AccountPage() {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [problem, setProblem] = useState<ProblemDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [stripeStatus, setStripeStatus] = useState<"NOT_STARTED" | "IN_PROGRESS" | "COMPLETE">("NOT_STARTED");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setProblem(null);

      const result = await requestHal<MeResponse>("/api/v1/me");
      if (!result.ok) {
        setProblem(result.problem);
        setLoading(false);
        return;
      }

      setMe(result.data);

      // Fetch Stripe Connect status for affiliates
      if (result.data.roles?.includes("AFFILIATE")) {
        const stripeResult = await requestHal<{ status: string }>("/api/v1/account/stripe-connect");
        if (stripeResult.ok) {
          const rawStatus = stripeResult.data.status;
          if (rawStatus === "COMPLETE") {
            setStripeStatus("COMPLETE");
          } else if (rawStatus === "PENDING" || rawStatus === "IN_PROGRESS") {
            setStripeStatus("IN_PROGRESS");
          } else {
            setStripeStatus("NOT_STARTED");
          }
        }
      }

      setLoading(false);
    };

    void load();
  }, []);

  const isApprentice = Boolean(me?.roles?.includes("APPRENTICE"));
  const isAffiliate = Boolean(me?.roles?.includes("AFFILIATE"));
  const isMaestro = Boolean(me?.roles?.includes("MAESTRO"));
  const isAdmin = Boolean(me?.roles?.includes("ADMIN") || me?.roles?.includes("SUPER_ADMIN"));
  const isOperator = isAdmin || isMaestro;
  const isAffiliateOnly = isAffiliate && !isApprentice && !isOperator;
  const isOperatorDashboard = isOperator && !isAffiliateOnly;

  return (
    <PageShell
      title="Dashboard"
      subtitle={
        isAffiliateOnly
          ? "Share your referral link, track attribution, and get paid."
          : isOperatorDashboard
            ? "Your operator cockpit."
            : "Manage your profile and registrations."
      }
    >
      {problem ? (
        <div className="mt-4 space-y-3">
          <ProblemDetailsPanel problem={problem} />
          {problem.status === 401 ? (
            <EmptyState
              title="You are not logged in"
              description="Sign in to access your account details and registrations."
              action={
                <Link href="/login" className="type-label underline">
                  Go to login
                </Link>
              }
            />
          ) : null}
        </div>
      ) : null}

      {me ? (
        <div className="mt-4">
          <OnboardingTaskList />
        </div>
      ) : null}
      {me ? (
        <Card className="mt-4 p-4">
          <ActionFeed />
        </Card>
      ) : null}
      {me ? (
        <div className="mt-4">
          <ReferralCard />
        </div>
      ) : null}
      {me && isAffiliate ? (
        <div className="mt-4">
          <PayoutActivation stripeStatus={stripeStatus} />
        </div>
      ) : null}
    </PageShell>
  );
}
