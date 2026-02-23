import Link from "next/link";
import { SearchX } from "lucide-react";
import { Card } from "@/components/primitives";

export default function NotFoundPage() {
  return (
    <main id="main-content" tabIndex={-1} className="container-grid py-6">
      <Card className="p-6 text-center">
        <div className="mx-auto mb-3 inline-flex size-12 items-center justify-center rounded-sm border border-border-default bg-surface text-text-secondary">
          <SearchX className="size-5" />
        </div>
        <h1 className="type-title text-text-primary">Page not found</h1>
        <p className="type-body mt-2 text-text-secondary">
          The page you’re looking for doesn’t exist or has moved.
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-3">
          <Link className="type-label underline" href="/">
            Home
          </Link>
          <Link className="type-label underline" href="/events">
            Browse events
          </Link>
          <Link className="type-label underline" href="/services">
            Browse services
          </Link>
          <Link className="type-label underline" href="/admin">
            Admin
          </Link>
        </div>
      </Card>
    </main>
  );
}
