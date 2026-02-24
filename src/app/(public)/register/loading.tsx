import { LoadingState } from "@/components/patterns";

export default function RegisterLoading() {
  return <LoadingState title="Loading" description="Preparing registration form." rows={2} />;
}
