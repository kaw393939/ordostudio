import { LoadingState } from "@/components/patterns";

export default function AdminAuditLoading() {
  return <LoadingState title="Loading audit log" description="Fetching audit entries." rows={6} />;
}
