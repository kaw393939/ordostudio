import { LoadingState } from "@/components/patterns";
import { PageShell } from "@/components/layout/page-shell";

export default function AdminLoading() {
  return (
    <PageShell title="Admin" subtitle="Loading admin console.">
      <LoadingState title="Loading admin" rows={4} />
    </PageShell>
  );
}
