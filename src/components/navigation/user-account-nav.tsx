import { MenuNav } from "@/components/navigation/menu-nav";
import { getMenuContext } from "@/lib/navigation/menu-audience";

export async function UserAccountNav() {
  const context = await getMenuContext();
  return (
    <div className="mb-8 border-b border-border-subtle">
      <MenuNav
        menu="userAccount"
        context={context}
        className="flex items-center gap-6 type-label text-text-secondary pb-4"
      />
    </div>
  );
}
