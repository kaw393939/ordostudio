"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { PageShell } from "@/components/layout/page-shell";
import { Card } from "@/components/primitives";
import { ProblemDetailsPanel } from "@/components/problem-details";
import { Badge } from "@/components/ui/badge";
import { RelativeTime } from "@/components/forms";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { requestHal, type ProblemDetails } from "@/lib/hal-client";
import type { ActionProposal } from "@/lib/api/action-proposals";

type ProposalListResponse = {
  count: number;
  items: ActionProposal[];
};

type RoleRequest = {
  id: string;
  user_id: string;
  user_email: string;
  requested_role_name: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  context: any;
  created_at: string;
};

type RoleRequestListResponse = {
  count: number;
  items: RoleRequest[];
};

export default function ApprovalsPage() {
  const [loading, setLoading] = useState(true);
  const [problem, setProblem] = useState<ProblemDetails | null>(null);
  const [proposals, setProposals] = useState<ActionProposal[]>([]);
  const [roleRequests, setRoleRequests] = useState<RoleRequest[]>([]);
  const [activeTab, setActiveTab] = useState<"actions" | "roles">("actions");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [resProposals, resRoles] = await Promise.all([
        requestHal<ProposalListResponse>("/api/v1/action-proposals?status=PENDING"),
        requestHal<RoleRequestListResponse>("/api/v1/admin/role-requests")
      ]);

      if (!resProposals.ok) {
        setProblem(resProposals.problem);
      } else {
        setProposals(resProposals.data.items);
      }

      if (!resRoles.ok) {
        setProblem(resRoles.problem);
      } else {
        setRoleRequests(resRoles.data.items.filter(r => r.status === "PENDING"));
      }

      setLoading(false);
    };

    void load();
  }, []);

  const handleRoleAction = async (id: string, status: "APPROVED" | "REJECTED") => {
    const res = await requestHal(`/api/v1/admin/role-requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    });

    if (!res.ok) {
      setProblem(res.problem);
      return;
    }

    setRoleRequests(prev => prev.filter(r => r.id !== id));
  };

  return (
    <PageShell
      title="Approvals"
      subtitle="Review and approve actions and role requests."
      breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Approvals" }]}
    >
      {problem && (
        <div className="mb-6">
          <ProblemDetailsPanel problem={problem} />
        </div>
      )}

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="mb-6">
          <TabsTrigger value="actions">Action Proposals</TabsTrigger>
          <TabsTrigger value="roles">Role Requests</TabsTrigger>
        </TabsList>

        <TabsContent value="actions">
          {loading ? (
            <div className="text-sm text-text-secondary" aria-busy="true">
              Loading proposals...
            </div>
          ) : proposals.length === 0 ? (
            <Card className="p-6 text-center text-sm text-text-secondary">
              No pending action proposals.
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
        </TabsContent>

        <TabsContent value="roles">
          {loading ? (
            <div className="text-sm text-text-secondary" aria-busy="true">
              Loading role requests...
            </div>
          ) : roleRequests.length === 0 ? (
            <Card className="p-6 text-center text-sm text-text-secondary">
              No pending role requests.
            </Card>
          ) : (
            <div className="grid gap-4">
              {roleRequests.map((req) => (
                <Card key={req.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="type-title text-text-primary">{req.requested_role_name}</h3>
                        <Badge variant="secondary">PENDING</Badge>
                      </div>
                      <div className="mt-1 text-sm text-text-secondary">
                        Requested by {req.user_email} <RelativeTime iso={req.created_at} />
                      </div>
                      <div className="mt-4 text-sm bg-muted p-3 rounded-md">
                        <pre className="whitespace-pre-wrap font-mono text-xs">
                          {JSON.stringify(req.context, null, 2)}
                        </pre>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => handleRoleAction(req.id, "APPROVED")}
                        className="inline-flex h-9 items-center justify-center rounded-md bg-state-success px-4 py-2 text-sm font-medium text-white shadow transition-colors hover:bg-state-success/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleRoleAction(req.id, "REJECTED")}
                        className="inline-flex h-9 items-center justify-center rounded-md bg-state-danger px-4 py-2 text-sm font-medium text-white shadow transition-colors hover:bg-state-danger/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}
