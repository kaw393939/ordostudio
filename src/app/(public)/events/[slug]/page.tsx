import type { Metadata } from "next";
import { notFound } from "next/navigation";
import EventDetailPageClient from "./page-client";
import { getEventBySlug } from "@/lib/api/events";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { slug } = await props.params;
  const fallback = slug ? `Event: ${slug}` : "Event";
  let title = fallback;

  if (slug) {
    try {
      const event = getEventBySlug(slug);
      if (event?.title) {
        title = event.title;
      }
    } catch {
      title = fallback;
    }
  }

  return {
    title,
    openGraph: {
      title,
    },
    alternates: {
      canonical: `/events/${encodeURIComponent(slug)}`,
    },
  };
}

export default async function EventDetailPage(props: PageProps) {
  const { slug } = await props.params;
  if (slug) {
    try {
      getEventBySlug(slug);
    } catch {
      notFound();
    }
  }

  return <EventDetailPageClient />;
}

