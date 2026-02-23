import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
  openGraph: {
    title: "Dashboard",
  },
  alternates: {
    canonical: "/account",
  },
};

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return children;
}
