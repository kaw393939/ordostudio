import Link from "next/link";
import { Card } from "@/components/primitives";

export default function EventNotFound() {
  return (
    <main className="container-grid py-6">
      <Card className="p-4">
        <h1 className="type-h2">This event doesn’t exist or has been removed.</h1>
        <p className="mt-2 type-body-sm text-text-secondary">
          Try browsing the latest events, or double-check the link you followed.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/events" className="type-label underline">
            Browse events
          </Link>
          <Link href="/" className="type-label underline">
            Go home
          </Link>
        </div>
      </Card>
    </main>
  );
}
