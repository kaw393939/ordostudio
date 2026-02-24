import { FeedItem } from "@/lib/api/feed";
import { Card } from "@/components/primitives";
import { buttonVariants } from "@/components/primitives/button";
import { RelativeTime } from "@/components/forms";
import Link from "next/link";

export function ActionRequiredCard({ item }: { item: FeedItem }) {
  return (
    <Card className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-l-4 border-l-red-500 bg-red-50/50">
      <div>
        <div className="text-sm text-red-600 font-semibold mb-1 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-alert-circle"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
          Action Required
        </div>
        <h3 className="text-lg font-medium text-gray-900">{item.title}</h3>
        <p className="text-sm text-gray-600 mt-1">{item.description}</p>
        <div className="text-xs text-red-400 mt-2 font-medium">
          Due: <RelativeTime iso={item.timestamp} />
        </div>
      </div>
      {item.actionUrl && (
        <Link href={item.actionUrl} className={buttonVariants({ intent: "danger" })}>
          Complete Action
        </Link>
      )}
    </Card>
  );
}
