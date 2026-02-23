import { AdminShell } from "@/components/admin/admin-shell";
import { getMenuAudience } from "@/lib/navigation/menu-audience";

const environment = process.env.NODE_ENV === "production" ? "Prod" : "Local";

export default async function AdminGroupLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const audience = await getMenuAudience();

  return (
    <AdminShell audience={audience} environmentLabel={environment}>
      {children}
    </AdminShell>
  );
}
