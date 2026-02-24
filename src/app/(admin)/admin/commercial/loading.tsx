import { LoadingState } from "@/components/patterns";

export default function AdminCommercialLoading() {
  return <LoadingState title="Loading commercial" description="Fetching commercial data." rows={4} />;
}
