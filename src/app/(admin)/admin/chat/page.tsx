"use client";

import { useEffect, useState } from "react";
import { PageShell } from "@/components/layout/page-shell";
import { MaestroChat } from "@/components/admin/maestro-chat";
import { OpsSummaryWidget } from "@/components/admin/ops-summary-widget";
import { requestHal, type HalResource } from "@/lib/hal-client";

export default function AdminChatPage() {
  const [userId, setUserId] = useState<string | undefined>(undefined);

  useEffect(() => {
    requestHal<HalResource & { id?: string }>("/api/v1/me").then((res) => {
      if (res.ok && res.data.id) {
        setUserId(res.data.id as string);
      }
    });
  }, []);

  return (
    <PageShell title="Ops Agent">
      <div className="flex h-[calc(100vh-8rem)] gap-0 overflow-hidden rounded-lg border">
        {/* Left panel — ops agent chat */}
        <div className="flex flex-1 flex-col min-w-0 border-r">
          <MaestroChat userId={userId} />
        </div>

        {/* Right panel — ops summary */}
        <div className="w-72 shrink-0 flex flex-col min-h-0">
          <div className="border-b px-4 py-2">
            <h2 className="text-sm font-medium">Ops Summary</h2>
          </div>
          <OpsSummaryWidget />
        </div>
      </div>
    </PageShell>
  );
}
