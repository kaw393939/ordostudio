import { LoadingState } from "@/components/patterns";

export default function AccountLoading() {
  return <LoadingState title="Loading account" description="Fetching your profile." rows={4} />;
}
