import { LoadingState } from "@/components/patterns";

export default function AccountRouteLoading() {
  return (
    <main className="container-grid py-6">
      <LoadingState title="Loading account" rows={4} />
    </main>
  );
}
