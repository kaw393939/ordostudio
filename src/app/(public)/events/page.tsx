import type { Metadata } from "next";
import EventsPageClient from "./page-client";

export const metadata: Metadata = {
  title: "Events",
  openGraph: {
    title: "Events",
  },
  alternates: {
    canonical: "/events",
  },
};

export default function EventsPage() {
  return <EventsPageClient />;
}
