import { LoadingState } from "@/components/patterns";

export default function LoginLoading() {
  return <LoadingState title="Loading" description="Preparing login form." rows={2} />;
}
