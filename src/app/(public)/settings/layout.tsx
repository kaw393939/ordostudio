import type { Metadata } from "next";
import { UserSidebar } from "@/components/navigation/user-sidebar";
import { getMenuContext } from "@/lib/navigation/menu-audience";

export const metadata: Metadata = {
  title: "Settings",
};

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const context = await getMenuContext();

  return <UserSidebar context={context}>{children}</UserSidebar>;
}
