import { LoadingState } from "@/components/patterns";

export default function AdminUsersLoading() {
  return <LoadingState title="Loading users" description="Fetching user records." rows={6} />;
}
