"use client";

import { useEffect, useState } from "react";
import { ProblemDetailsPanel } from "@/components/problem-details";
import { requestHal, type HalResource, type ProblemDetails } from "@/lib/hal-client";
import { adminAccessProblem, canAccessAdminFromMe } from "@/lib/ui-access";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [problem, setProblem] = useState<ProblemDetails | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const me = await requestHal<HalResource>("/api/v1/me");

      if (!me.ok) {
        setProblem(me.problem);
        setLoading(false);
        return;
      }

      if (!canAccessAdminFromMe(me.data)) {
        setProblem(adminAccessProblem);
        setLoading(false);
        return;
      }

      setProblem(null);
      setLoading(false);
    };

    void load();
  }, []);

  if (loading) {
    return <main id="main-content" tabIndex={-1} className="mx-auto max-w-4xl p-6 text-sm" aria-busy="true">Checking admin access...</main>;
  }

  if (problem) {
    return (
      <main id="main-content" tabIndex={-1} className="mx-auto max-w-4xl p-6" role="alert">
        <ProblemDetailsPanel problem={problem} />
      </main>
    );
  }

  return <>{children}</>;
}
