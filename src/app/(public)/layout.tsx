import { MenuNav } from "@/components/navigation/menu-nav";
import { getMenuContext } from "@/lib/navigation/menu-audience";
import Link from "next/link";

export default async function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const context = await getMenuContext();

  return (
    <>
      <header className="border-b border-border-subtle bg-surface">
        <div className="container-grid flex items-center justify-between gap-4 py-4">
          <Link href="/" className="motion-base shrink-0 type-label text-text-primary" aria-label="Studio Ordo home">
            Studio Ordo
          </Link>
          <MenuNav
            menu="publicHeader"
            context={context}
            className="min-w-0 flex items-center gap-4 type-label text-text-secondary"
          />
        </div>
      </header>
      {children}
      <footer className="border-t border-border-subtle bg-surface">
        <div className="container-grid flex flex-wrap items-center justify-between gap-3 py-6">
          <p className="type-meta text-text-muted">© {new Date().getFullYear()} Studio Ordo</p>
          <MenuNav
            menu="publicFooter"
            context={context}
            variant="footer"
            className="flex flex-wrap items-center gap-3 type-label text-text-secondary"
          />
        </div>
      </footer>
    </>
  );
}
