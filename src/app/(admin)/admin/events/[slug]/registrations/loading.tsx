import { LoadingState } from "@/components/patterns";

export default function AdminRegistrationsRouteLoading() {
  return (
    <main className="container-grid py-6">
      <LoadingState title="Loading registrations" rows={6} />
    </main>
  );
}
