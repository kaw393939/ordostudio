import { LoadingState } from "@/components/patterns";

export default function AdminEventRouteLoading() {
  return (
    <main className="container-grid py-6">
      <LoadingState title="Loading event workspace" rows={5} />
    </main>
  );
}
