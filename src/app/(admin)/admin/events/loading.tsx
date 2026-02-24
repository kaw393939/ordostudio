import { LoadingState } from "@/components/patterns";

export default function AdminEventsLoading() {
  return <LoadingState title="Loading events" description="Fetching event list." rows={6} />;
}
