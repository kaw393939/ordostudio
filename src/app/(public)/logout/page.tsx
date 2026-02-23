import type { Metadata } from "next";

import { PageShell } from "@/components/layout/page-shell";
import { LogoutClient } from "./page-client";

export const metadata: Metadata = {
  title: "Logout • Studio Ordo",
  description: "Sign out of Studio Ordo.",
  alternates: { canonical: "/logout" },
  robots: { index: false, follow: false },
};

export default function LogoutPage() {
  return (
    <PageShell
      title="Signing you out"
      subtitle="If nothing happens, use the button below."
      breadcrumbs={[{ label: "Logout" }]}
    >
      <LogoutClient />
    </PageShell>
  );
}
