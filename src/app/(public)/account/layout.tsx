import type { Metadata } from "next";
import { UserAccountNav } from "@/components/navigation/user-account-nav";

export const metadata: Metadata = {
  title: "My Account",
  openGraph: {
    title: "My Account",
  },
  alternates: {
    canonical: "/account",
  },
};

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="container-grid pt-6">
        <UserAccountNav />
      </div>
      {children}
    </>
  );
}
