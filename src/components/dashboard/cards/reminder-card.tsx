import { FeedItem } from "@/lib/api/feed";
import { Card } from "@/components/primitives";
import { RelativeTime } from "@/components/forms";
import Link from "next/link";

export function ReminderCard({ item }: { item: FeedItem }) {
  return (
    <Card className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-l-4 border-l-gray-300 bg-gray-50/50">
      <div className="flex items-start gap-3">
        <div className="mt-1 text-gray-400">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-bell"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
        </div>
        <div>
          <div className="text-sm text-gray-500 font-medium mb-1">Reminder</div>
          <h3 className="text-base font-medium text-gray-800">{item.title}</h3>
          <p className="text-sm text-gray-500 mt-1">{item.description}</p>
          <div className="text-xs text-gray-400 mt-2">
            <RelativeTime iso={item.timestamp} />
          </div>
        </div>
      </div>
      {item.actionUrl && (
        <Link href={item.actionUrl} className="text-sm text-blue-600 hover:underline font-medium">
          View
        </Link>
      )}
    </Card>
  );
}
