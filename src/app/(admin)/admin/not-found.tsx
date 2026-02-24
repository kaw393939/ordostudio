import Link from "next/link";
import { ErrorState } from "@/components/patterns";

export default function AdminNotFound() {
  return (
    <main id="main-content" tabIndex={-1} className="mx-auto max-w-4xl p-6">
      <ErrorState
        title="Page not found"
        description="The admin page you are looking for does not exist or has been moved."
        action={
          <Link href="/admin" className="type-label underline">
            Back to Admin Dashboard
          </Link>
        }
      />
    </main>
  );
}
