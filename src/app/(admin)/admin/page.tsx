import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { Card } from "@/components/primitives";
import { getMenuContext } from "@/lib/navigation/menu-audience";
import { resolveMenuForContext } from "@/lib/navigation/menu-registry";

export const metadata = {
  title: "Admin • Dashboard",
};

export default async function AdminHomePage() {
  const context = await getMenuContext();
  const items = resolveMenuForContext("adminHeaderQuick", context).filter((item) => item.href !== "/admin");

  return (
    <PageShell
      title="Admin Dashboard"
      subtitle="Operations overview and shortcuts."
      breadcrumbs={[{ label: "Admin" }, { label: "Dashboard" }]}
    >
      <div className="grid gap-3 md:grid-cols-2">
        {items.map((item) => (
          <Card key={item.id} className="p-4">
            <h2 className="type-title text-text-primary">{item.label}</h2>
            <div className="mt-3">
              <Link href={item.href} className="type-label underline">
                Open
              </Link>
            </div>
          </Card>
        ))}
      </div>
    </PageShell>
  );
}
