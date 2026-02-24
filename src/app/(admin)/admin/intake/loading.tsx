import { LoadingState } from "@/components/patterns";

export default function AdminIntakeLoading() {
  return <LoadingState title="Loading intake" description="Fetching intake requests." rows={5} />;
}
