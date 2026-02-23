import { LoadingState } from "@/components/patterns";

export default function EventsRouteLoading() {
  return (
    <main className="container-grid py-6">
      <LoadingState title="Loading events" rows={6} />
    </main>
  );
}
