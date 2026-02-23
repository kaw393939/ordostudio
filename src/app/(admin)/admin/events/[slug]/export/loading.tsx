import { LoadingState } from "@/components/patterns";

export default function AdminExportRouteLoading() {
  return (
    <main className="container-grid py-6">
      <LoadingState title="Loading export tools" rows={4} />
    </main>
  );
}
