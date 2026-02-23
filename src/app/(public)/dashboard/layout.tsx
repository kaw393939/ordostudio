import type { Metadata } from "next";
import { UserAccountNav } from "@/components/navigation/user-account-nav";

export const metadata: Metadata = {
  title: "Dashboard",
  openGraph: {
    title: "Dashboard",
  },
  alternates: {
    canonical: "/dashboard",
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
