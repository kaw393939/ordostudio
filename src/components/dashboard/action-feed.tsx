"use client";

import { useEffect, useState } from "react";
import { EmptyState, ErrorState } from "@/components/patterns";
import { requestHal } from "@/lib/hal-client";
import { FeedItem } from "@/lib/api/feed";
import { UpcomingEventCard } from "./cards/upcoming-event-card";
import { ActionRequiredCard } from "./cards/action-required-card";
import { ReminderCard } from "./cards/reminder-card";
import { Skeleton } from "@/components/ui/skeleton";

export function ActionFeed() {
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  useEffect(() => {
    async function fetchFeed() {
      try {
        const response = await requestHal<{ count: number; items: FeedItem[]; hasMore: boolean }>("/api/v1/me/feed?page=1&limit=10");
        if (response.ok) {
          setFeedItems(response.data.items);
          setHasMore(response.data.hasMore);
        } else {
          setError(response.problem.detail || "Failed to load your action feed.");
        }
      } catch (err) {
        console.error("Failed to fetch feed:", err);
        setError("Failed to load your action feed.");
      } finally {
        setIsLoading(false);
      }
    }

    fetchFeed();
  }, []);

  const loadMore = async () => {
    if (isLoadingMore || !hasMore) return;
    
    setIsLoadingMore(true);
    try {
      const nextPage = page + 1;
      const response = await requestHal<{ count: number; items: FeedItem[]; hasMore: boolean }>(`/api/v1/me/feed?page=${nextPage}&limit=10`);
      if (response.ok) {
        setFeedItems((prev) => [...prev, ...response.data.items]);
        setHasMore(response.data.hasMore);
        setPage(nextPage);
      }
    } catch (err) {
      console.error("Failed to load more feed items:", err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState
        title="Failed to load feed"
        description={error}
        action={
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="motion-base rounded-sm border border-border-default bg-action-secondary px-3 py-1.5 type-label text-text-primary hover:bg-action-secondary-hover"
          >
            Try again
          </button>
        }
      />
    );
  }

  if (feedItems.length === 0) {
    return (
      <EmptyState
        title="No upcoming events or actions required."
        description="You're all caught up! Check back later for new updates."
      />
    );
  }

  return (
    <div className="space-y-4">
      {feedItems.map((item) => {
        switch (item.type) {
          case "AccountRegistration":
          case "EngagementTimelineItem":
            return <UpcomingEventCard key={item.id} item={item} />;
          case "FollowUpAction":
            return <ActionRequiredCard key={item.id} item={item} />;
          default:
            return <ReminderCard key={item.id} item={item} />;
        }
      })}
      
      {hasMore && (
        <div className="pt-4 flex justify-center">
          <button 
            onClick={loadMore}
            disabled={isLoadingMore}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {isLoadingMore ? "Loading..." : "Load More"}
          </button>
        </div>
      )}
      
      {!hasMore && feedItems.length > 0 && (
        <div className="pt-4 text-center text-sm text-gray-500">
          No more items
        </div>
      )}
    </div>
  );
}
