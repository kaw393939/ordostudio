import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Account",
  openGraph: {
    title: "Account",
  },
  alternates: {
    canonical: "/account",
  },
};

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return children;
}
