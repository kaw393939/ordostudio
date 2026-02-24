import { Card } from "@/components/primitives";
import { PageShell } from "@/components/layout/page-shell";
import { PLANS, getDefaultSubscription } from "@/lib/subscriptions";
import type { PlanTier } from "@/lib/subscriptions";

export const metadata = {
  title: "Settings • Billing",
};

function PlanBadge({ tier }: { tier: PlanTier }) {
  const colors: Record<PlanTier, string> = {
    free: "bg-border-subtle text-text-muted",
    starter: "bg-action-primary/10 text-action-primary",
    professional: "bg-state-success/10 text-state-success",
    enterprise: "bg-state-warning/10 text-state-warning",
  };

  return (
    <span className={`inline-block rounded-full px-2 py-0.5 type-meta ${colors[tier]}`}>
      {PLANS[tier].name}
    </span>
  );
}

export default function BillingPage() {
  // Stub: in production, fetch real subscription from DB via session user
  const subscription = getDefaultSubscription("current-user");
  const currentPlan = PLANS[subscription.planTier];

  return (
    <PageShell
      title="Billing"
      subtitle="Manage your payment methods and view invoices."
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Billing" },
      ]}
    >
      {/* Current plan */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="type-title text-text-primary">Current Plan</h2>
            <div className="mt-2 flex items-center gap-2">
              <PlanBadge tier={subscription.planTier} />
              <span className="type-body-sm text-text-secondary">
                {subscription.status === "active" ? "Active" : subscription.status}
              </span>
            </div>
          </div>
          <div className="text-right">
            <p className="type-h3 text-text-primary">
              ${(currentPlan.monthlyPriceCents / 100).toFixed(2)}
            </p>
            <p className="type-meta text-text-muted">/month</p>
          </div>
        </div>

        <ul className="mt-4 space-y-1">
          {currentPlan.features.map((feature) => (
            <li key={feature} className="type-body-sm text-text-secondary flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-state-success" />
              {feature}
            </li>
          ))}
        </ul>
      </Card>

      {/* Available plans */}
      <div className="mt-6">
        <h2 className="type-title text-text-primary">Available Plans</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Object.values(PLANS).map((plan) => (
            <Card
              key={plan.tier}
              className={`p-4 ${plan.tier === subscription.planTier ? "ring-2 ring-action-primary" : ""}`}
            >
              <h3 className="type-label text-text-primary">{plan.name}</h3>
              <p className="type-h3 text-text-primary mt-1">
                {plan.monthlyPriceCents === 0
                  ? "Free"
                  : `$${(plan.monthlyPriceCents / 100).toFixed(2)}/mo`}
              </p>
              <ul className="mt-3 space-y-1">
                {plan.features.map((feature) => (
                  <li key={feature} className="type-meta text-text-secondary">
                    {feature}
                  </li>
                ))}
              </ul>
              {plan.tier === subscription.planTier ? (
                <p className="mt-4 type-meta text-action-primary font-medium">Current plan</p>
              ) : plan.tier === "free" ? null : (
                <button
                  type="button"
                  disabled
                  className="mt-4 w-full rounded-md bg-action-primary px-3 py-1.5 type-label text-white opacity-50"
                  title="Connect Stripe to enable plan changes"
                >
                  Upgrade
                </button>
              )}
            </Card>
          ))}
        </div>
      </div>

      {/* Payment methods / portal link */}
      <Card className="mt-6 p-6">
        <h2 className="type-title text-text-primary">Payment Methods</h2>
        <p className="type-body-sm text-text-secondary mt-2">
          Payment method management will be available via the Stripe Customer Portal once
          your Stripe account is connected. Set <code className="type-meta">STRIPE_SECRET_KEY</code> to enable.
        </p>
      </Card>

      {/* Invoice history */}
      <Card className="mt-6 p-6">
        <h2 className="type-title text-text-primary">Invoice History</h2>
        <p className="type-body-sm text-text-secondary mt-2">
          No invoices yet. Invoices will appear here when you subscribe to a paid plan.
        </p>
      </Card>
    </PageShell>
  );
}
