import type { Metadata } from "next";
import StudioReportPageClient from "./page-client";

export const metadata: Metadata = {
  title: "Submit report • Studio • Studio Ordo",
  description: "Submit a structured field report after attending a recommended event.",
  openGraph: {
    title: "Submit report • Studio • Studio Ordo",
    description: "Submit a structured field report after attending a recommended event.",
  },
  alternates: {
    canonical: "/studio/report",
  },
};

export default function StudioReportPage() {
  return <StudioReportPageClient />;
}
