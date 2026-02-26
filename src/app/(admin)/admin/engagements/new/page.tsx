"use client";

import { useState } from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { Card } from "@/components/primitives";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createEngagement } from "../actions";

import { AFFILIATE_COMMISSION_RATE } from "@/lib/constants/commissions";
const COMMISSION_RATE = AFFILIATE_COMMISSION_RATE;

export default function NewEngagementPage() {
  const [type, setType] = useState<"PROJECT_COMMISSION" | "MAESTRO_TRAINING" | "">(
    "",
  );
  const [totalValue, setTotalValue] = useState("");

  const commission =
    totalValue && !isNaN(parseFloat(totalValue))
      ? (parseFloat(totalValue) * COMMISSION_RATE).toFixed(2)
      : "";

  return (
    <PageShell
      title="New Engagement"
      subtitle="Record a new project commission or Maestro Training enrolment."
      breadcrumbs={[
        { label: "Admin", href: "/admin" },
        { label: "Engagements", href: "/admin/engagements" },
        { label: "New" },
      ]}
    >
      <Card className="max-w-xl p-6">
        <form action={createEngagement} className="space-y-5">

          {/* Step 1: type */}
          <div className="space-y-1">
            <Label htmlFor="type">Engagement type *</Label>
            <Select
              name="type"
              value={type}
              onValueChange={(v) =>
                setType(v as "PROJECT_COMMISSION" | "MAESTRO_TRAINING")
              }
              required
            >
              <SelectTrigger id="type">
                <SelectValue placeholder="Select type…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PROJECT_COMMISSION">Project Commission</SelectItem>
                <SelectItem value="MAESTRO_TRAINING">Maestro Training</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Type-specific fields */}
          {type === "PROJECT_COMMISSION" && (
            <>
              <div className="space-y-1">
                <Label htmlFor="client_name">Client name</Label>
                <Input id="client_name" name="client_name" placeholder="Acme Corp" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="project_type">Project type</Label>
                <Input
                  id="project_type"
                  name="project_type"
                  placeholder="e.g. AI workflow automation"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="total_value">Total project value (USD)</Label>
                <Input
                  id="total_value"
                  name="total_value"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="5000.00"
                  value={totalValue}
                  onChange={(e) => setTotalValue(e.target.value)}
                />
              </div>
              {commission && (
                <p className="text-sm text-muted-foreground">
                  Commission (20%): <strong>${commission}</strong>
                </p>
              )}
            </>
          )}

          {type === "MAESTRO_TRAINING" && (
            <>
              <div className="space-y-1">
                <Label htmlFor="student_id">Student ID or email</Label>
                <Input id="student_id" name="student_id" placeholder="user@example.com" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="track">Track</Label>
                <Select name="track" defaultValue="">
                  <SelectTrigger id="track">
                    <SelectValue placeholder="Select track…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cohort">Cohort</SelectItem>
                    <SelectItem value="advisory">Advisory</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="cohort_start">Cohort start date</Label>
                <Input id="cohort_start" name="cohort_start" type="date" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="total_value">Tuition value (USD)</Label>
                <Input
                  id="total_value"
                  name="total_value"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="2500.00"
                  value={totalValue}
                  onChange={(e) => setTotalValue(e.target.value)}
                />
              </div>
              {commission && (
                <p className="text-sm text-muted-foreground">
                  Commission (20%): <strong>${commission}</strong>
                </p>
              )}
            </>
          )}

          {/* Common fields (shown once type is selected) */}
          {type && (
            <>
              <div className="space-y-1">
                <Label htmlFor="referral_code">Referral code (optional)</Label>
                <Input
                  id="referral_code"
                  name="referral_code"
                  placeholder="ABC123"
                  className="uppercase"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" name="notes" rows={3} placeholder="Any context…" />
              </div>
            </>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={!type}
              className="inline-flex items-center rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90 disabled:opacity-40"
            >
              Create engagement
            </button>
            <Link
              href="/admin/engagements"
              className="inline-flex items-center px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
            >
              Cancel
            </Link>
          </div>
        </form>
      </Card>
    </PageShell>
  );
}
