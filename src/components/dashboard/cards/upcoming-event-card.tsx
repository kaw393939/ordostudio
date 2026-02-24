import { FeedItem } from "@/lib/api/feed";
import { Card } from "@/components/primitives";
import { buttonVariants } from "@/components/primitives/button";
import { RelativeTime } from "@/components/forms";
import Link from "next/link";

export function UpcomingEventCard({ item }: { item: FeedItem }) {
  return (
    <Card className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-l-4 border-l-blue-500">
      <div>
        <div className="text-sm text-blue-600 font-semibold mb-1">Upcoming Event</div>
        <h3 className="text-lg font-medium text-gray-900">{item.title}</h3>
        <p className="text-sm text-gray-500 mt-1">{item.description}</p>
        <div className="text-xs text-gray-400 mt-2">
          <RelativeTime iso={item.timestamp} />
        </div>
      </div>
      {item.actionUrl && (
        <Link href={item.actionUrl} className={buttonVariants({ intent: "primary" })}>
          View Details
        </Link>
      )}
    </Card>
  );
}
