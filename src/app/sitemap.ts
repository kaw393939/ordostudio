import type { MetadataRoute } from "next";
import { listEvents } from "@/lib/api/events";
import { getSitemapStaticPaths } from "@/lib/navigation/menu-registry";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

const absolute = (path: string) => new URL(path, BASE_URL).toString();

const getPublishedEventPaths = (): string[] => {
  const slugs: string[] = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const result = listEvents({ status: "PUBLISHED", limit, offset });
    for (const item of result.items) {
      slugs.push(`/events/${item.slug}`);
    }

    if (result.items.length < limit) {
      break;
    }

    offset += result.items.length;
  }

  return slugs;
};

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPaths = getSitemapStaticPaths();
  const eventPaths = getPublishedEventPaths();
  const now = new Date();

  return [...new Set([...staticPaths, ...eventPaths])].map((path) => ({
    url: absolute(path),
    lastModified: now,
    changeFrequency: path.startsWith("/events/") ? "daily" : "weekly",
    priority: path === "/events" ? 1 : path.startsWith("/events/") ? 0.8 : 0.7,
  }));
}
