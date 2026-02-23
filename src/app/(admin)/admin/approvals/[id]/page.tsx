"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";

import { PageShell } from "@/components/layout/page-shell";
import { Button, Card } from "@/components/primitives";
import { ProblemDetailsPanel } from "@/components/problem-details";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RelativeTime } from "@/components/forms";
import { requestHal, type ProblemDetails } from "@/lib/hal-client";
import type { ActionProposal } from "@/lib/api/action-proposals";

export default function ReviewProposalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [problem, setProblem] = useState<ProblemDetails | null>(null);
  const [proposal, setProposal] = useState<ActionProposal | null>(null);
  const [rationale, setRationale] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const res = await requestHal<ActionProposal>(`/api/v1/action-proposals/${id}`);

      if (!res.ok) {
        setProblem(res.problem);
        setLoading(false);
        return;
      }

      setProposal(res.data);
      setProblem(null);
      setLoading(false);
    };

    void load();
  }, [id]);

  const handleReview = async (status: "APPROVED" | "DENIED") => {
    setSubmitting(true);
    setProblem(null);

    const res = await requestHal<ActionProposal>(`/api/v1/action-proposals/${id}`, {
      method: "POST",
      body: JSON.stringify({ status, rationale }),
    });

    if (!res.ok) {
      setProblem(res.problem);
      setSubmitting(false);
      return;
    }

    router.push("/admin/approvals");
  };

  if (loading) {
    return (
      <PageShell
        title="Review Proposal"
        subtitle="Loading..."
        breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Approvals", href: "/admin/approvals" }, { label: "Review" }]}
      >
        <div className="text-sm text-text-secondary" aria-busy="true">
          Loading proposal...
        </div>
      </PageShell>
    );
  }

  if (problem || !proposal) {
    return (
      <PageShell
        title="Review Proposal"
        subtitle="Error loading proposal."
        breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Approvals", href: "/admin/approvals" }, { label: "Review" }]}
      >
        {problem && <ProblemDetailsPanel problem={problem} />}
      </PageShell>
    );
  }

  return (
    <PageShell
      title={`Review: ${proposal.action_type}`}
      subtitle={`Proposed by ${proposal.proposed_by || "System"}`}
      breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Approvals", href: "/admin/approvals" }, { label: "Review" }]}
    >
      <div className="grid gap-6">
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="type-title text-text-primary">Proposal Details</h2>
            <Badge variant={proposal.risk_level === "HIGH" ? "destructive" : proposal.risk_level === "MEDIUM" ? "default" : "secondary"}>
              {proposal.risk_level} RISK
            </Badge>
          </div>

          <div className="grid gap-4 text-sm">
            <div>
              <Label className="text-text-secondary">Status</Label>
              <div className="mt-1 font-medium">{proposal.status}</div>
            </div>
            <div>
              <Label className="text-text-secondary">Proposed At</Label>
              <div className="mt-1">
                <RelativeTime iso={proposal.proposed_at} />
              </div>
            </div>
            <div>
              <Label className="text-text-secondary">Payload</Label>
              <pre className="mt-1 overflow-x-auto rounded-md bg-surface-secondary p-4 text-xs">
                {JSON.stringify(JSON.parse(proposal.payload), null, 2)}
              </pre>
            </div>
            <div>
              <Label className="text-text-secondary">Preconditions</Label>
              <pre className="mt-1 overflow-x-auto rounded-md bg-surface-secondary p-4 text-xs">
                {JSON.stringify(JSON.parse(proposal.preconditions), null, 2)}
              </pre>
            </div>
          </div>
        </Card>

        {proposal.status === "PENDING" && (
          <Card className="p-6">
            <h2 className="type-title mb-4 text-text-primary">Review Decision</h2>
            <div className="grid gap-4">
              <div>
                <Label htmlFor="rationale">Rationale (Optional)</Label>
                <Textarea
                  id="rationale"
                  value={rationale}
                  onChange={(e) => setRationale(e.target.value)}
                  placeholder="Explain why this action is being approved or denied..."
                  className="mt-1"
                />
              </div>
              <div className="flex gap-3">
                <Button
                  intent="primary"
                  onClick={() => handleReview("APPROVED")}
                  disabled={submitting}
                >
                  Approve Action
                </Button>
                <Button
                  intent="danger"
                  onClick={() => handleReview("DENIED")}
                  disabled={submitting}
                >
                  Deny Action
                </Button>
              </div>
            </div>
          </Card>
        )}

        {proposal.status !== "PENDING" && (
          <Card className="p-6">
            <h2 className="type-title mb-4 text-text-primary">Review History</h2>
            <div className="grid gap-4 text-sm">
              <div>
                <Label className="text-text-secondary">Reviewed By</Label>
                <div className="mt-1">{proposal.reviewed_by}</div>
              </div>
              <div>
                <Label className="text-text-secondary">Reviewed At</Label>
                <div className="mt-1">
                  {proposal.reviewed_at ? <RelativeTime iso={proposal.reviewed_at} /> : "N/A"}
                </div>
              </div>
              <div>
                <Label className="text-text-secondary">Rationale</Label>
                <div className="mt-1">{proposal.rationale || "No rationale provided."}</div>
              </div>
            </div>
          </Card>
        )}
      </div>
    </PageShell>
  );
}
