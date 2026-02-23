"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { PageShell } from "@/components/layout/page-shell";
import { Card } from "@/components/primitives";
import { ProblemDetailsPanel } from "@/components/problem-details";
import { Badge } from "@/components/ui/badge";
import { RelativeTime } from "@/components/forms";
import { requestHal, type ProblemDetails } from "@/lib/hal-client";
import type { ActionProposal } from "@/lib/api/action-proposals";

type ProposalListResponse = {
  count: number;
  items: ActionProposal[];
};

export default function ApprovalsPage() {
  const [loading, setLoading] = useState(true);
  const [problem, setProblem] = useState<ProblemDetails | null>(null);
  const [proposals, setProposals] = useState<ActionProposal[]>([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const res = await requestHal<ProposalListResponse>("/api/v1/action-proposals?status=PENDING");

      if (!res.ok) {
        setProblem(res.problem);
        setLoading(false);
        return;
      }

      setProposals(res.data.items);
      setProblem(null);
      setLoading(false);
    };

    void load();
  }, []);

  return (
    <PageShell
      title="Action Approvals"
      subtitle="Review and approve actions proposed by agents."
      breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Approvals" }]}
    >
      {problem && (
        <div className="mb-6">
          <ProblemDetailsPanel problem={problem} />
        </div>
      )}

      {loading ? (
        <div className="text-sm text-text-secondary" aria-busy="true">
          Loading proposals...
        </div>
      ) : proposals.length === 0 ? (
        <Card className="p-6 text-center text-sm text-text-secondary">
          No pending proposals.
        </Card>
      ) : (
        <div className="grid gap-4">
          {proposals.map((proposal) => (
            <Card key={proposal.id} className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="type-title text-text-primary">{proposal.action_type}</h3>
                    <Badge variant={proposal.risk_level === "HIGH" ? "destructive" : proposal.risk_level === "MEDIUM" ? "default" : "secondary"}>
                      {proposal.risk_level} RISK
                    </Badge>
                  </div>
                  <div className="mt-1 text-sm text-text-secondary">
                    Proposed by {proposal.proposed_by || "System"} <RelativeTime iso={proposal.proposed_at} />
                  </div>
                </div>
                <Link
                  href={`/admin/approvals/${proposal.id}`}
                  className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                >
                  Review
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </PageShell>
  );
}
