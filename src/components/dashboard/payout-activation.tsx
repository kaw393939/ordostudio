"use client";

import { useState } from "react";
import { Card } from "@/components/primitives";
import { Button } from "@/components/primitives";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProblemDetailsPanel } from "@/components/problem-details";
import { requestHal, type ProblemDetails } from "@/lib/hal-client";

type StripeStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETE";

interface Props {
  stripeStatus: StripeStatus;
}

interface FormState {
  legal_name: string;
  entity_type: "" | "INDIVIDUAL" | "LLC" | "S_CORP" | "C_CORP";
  address_line1: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
}

const initialForm: FormState = {
  legal_name: "",
  entity_type: "",
  address_line1: "",
  city: "",
  state: "",
  postal_code: "",
  country: "US",
};

export function PayoutActivation({ stripeStatus }: Props) {
  const [pending, setPending] = useState(false);
  const [problem, setProblem] = useState<ProblemDetails | null>(null);
  const [form, setForm] = useState<FormState>(initialForm);

  const setField = (key: keyof FormState) => (value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProblem(null);
    setPending(true);

    try {
      const res = await requestHal<{ onboarding_url: string }>(
        "/api/v1/account/payout-activate",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(form),
        },
      );
      if ("problem" in res) {
        setProblem(res.problem);
      } else {
        window.location.href = res.data.onboarding_url;
      }
    } finally {
      setPending(false);
    }
  };

  const handleResume = async () => {
    setProblem(null);
    setPending(true);
    try {
      const res = await requestHal<{ onboarding_url: string }>(
        "/api/v1/account/payout-activate",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(initialForm),
        },
      );
      if ("problem" in res) {
        setProblem(res.problem);
      } else {
        window.location.href = res.data.onboarding_url;
      }
    } finally {
      setPending(false);
    }
  };

  if (stripeStatus === "COMPLETE") {
    return (
      <Card className="p-4">
        <p className="text-sm font-medium text-green-600">✓ Payout account active</p>
        <p className="text-sm text-gray-500 mt-1">You are set up to receive commissions.</p>
      </Card>
    );
  }

  if (stripeStatus === "IN_PROGRESS") {
    return (
      <Card className="p-4">
        <h3 className="text-sm font-semibold mb-2">Complete Stripe Setup</h3>
        <p className="text-sm text-gray-600 mb-3">
          Your payout account setup is in progress. Resume to finish connecting your account.
        </p>
        {problem && <div className="mb-3"><ProblemDetailsPanel problem={problem} /></div>}
        <Button onClick={handleResume} disabled={pending} size="sm">
          {pending ? "Loading…" : "Resume Stripe setup →"}
        </Button>
      </Card>
    );
  }

  // NOT_STARTED: full tax info form
  return (
    <Card className="p-4">
      <h3 className="text-sm font-semibold mb-1">Set up payouts</h3>
      <p className="text-sm text-gray-600 mb-4">
        Enter your tax information to activate your affiliate payout account.
      </p>
      {problem && <div className="mb-3"><ProblemDetailsPanel problem={problem} /></div>}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-1">
          <Label htmlFor="legal_name">Legal Name</Label>
          <Input
            id="legal_name"
            value={form.legal_name}
            onChange={(e) => setField("legal_name")(e.target.value)}
            placeholder="Your legal name or business name"
            required
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="entity_type">Entity Type</Label>
          <Select value={form.entity_type} onValueChange={setField("entity_type")}>
            <SelectTrigger id="entity_type">
              <SelectValue placeholder="Select entity type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="INDIVIDUAL">Individual</SelectItem>
              <SelectItem value="LLC">LLC</SelectItem>
              <SelectItem value="S_CORP">S-Corp</SelectItem>
              <SelectItem value="C_CORP">C-Corp</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="address_line1">Address</Label>
          <Input
            id="address_line1"
            value={form.address_line1}
            onChange={(e) => setField("address_line1")(e.target.value)}
            placeholder="123 Main St"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label htmlFor="city">City</Label>
            <Input
              id="city"
              value={form.city}
              onChange={(e) => setField("city")(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="state">State</Label>
            <Input
              id="state"
              value={form.state}
              onChange={(e) => setField("state")(e.target.value)}
              placeholder="NY"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label htmlFor="postal_code">Postal Code</Label>
            <Input
              id="postal_code"
              value={form.postal_code}
              onChange={(e) => setField("postal_code")(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="country">Country</Label>
            <Input
              id="country"
              value={form.country}
              onChange={(e) => setField("country")(e.target.value)}
              maxLength={2}
              required
            />
          </div>
        </div>

        <Button type="submit" disabled={pending || !form.entity_type} className="w-full">
          {pending ? "Submitting…" : "Continue to Stripe →"}
        </Button>
      </form>
    </Card>
  );
}
