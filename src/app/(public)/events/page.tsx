import { buildMetadata } from "@/lib/metadata";
import EventsPageClient from "./page-client";

export const metadata = buildMetadata({
  title: "Events",
  description:
    "Discover upcoming Studio Ordo workshops, leadership briefings, and community events.",
  canonical: "/events",
});

export default function EventsPage() {
  return <EventsPageClient />;
}
