import { LoadingState } from "@/components/patterns";
import { PageShell } from "@/components/layout/page-shell";

export default function PublicLoading() {
  return (
    <PageShell title="Loading" subtitle="Preparing your view.">
      <LoadingState title="Loading page" rows={4} />
    </PageShell>
  );
}
