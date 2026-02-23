import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Request Service",
  openGraph: {
    title: "Request Service",
  },
  alternates: {
    canonical: "/services/request",
  },
};

export default function ServiceRequestLayout({ children }: { children: React.ReactNode }) {
  return children;
}
