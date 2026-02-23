import { AdminShell } from "@/components/admin/admin-shell";
import { getMenuContext } from "@/lib/navigation/menu-audience";

const environment = process.env.NODE_ENV === "production" ? "Prod" : "Local";

export default async function AdminGroupLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const context = await getMenuContext();

  return (
    <AdminShell audience={context.audience} roles={context.roles} environmentLabel={environment}>
      {children}
    </AdminShell>
  );
}
