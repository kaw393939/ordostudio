import { MenuNav } from "@/components/navigation/menu-nav";
import { getMenuAudience } from "@/lib/navigation/menu-audience";
import Link from "next/link";

export default async function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const audience = await getMenuAudience();

  return (
    <>
      <header className="border-b border-border-subtle bg-surface">
        <div className="container-grid flex flex-wrap items-center justify-between gap-4 py-4">
          <Link href="/" className="motion-base type-label text-text-primary" aria-label="Studio Ordo home">
            Studio Ordo
          </Link>
          <MenuNav
            menu="publicPrimary"
            audience={audience}
            className="flex items-center gap-4 type-label text-text-secondary"
          />
        </div>
      </header>
      {children}
      <footer className="border-t border-border-subtle bg-surface">
        <div className="container-grid flex flex-wrap items-center justify-between gap-3 py-6">
          <p className="type-meta text-text-muted">© {new Date().getFullYear()} Studio Ordo</p>
          <nav className="flex items-center gap-3" aria-label="Legal">
            <Link className="type-label underline" href="/terms">
              Terms
            </Link>
            <Link className="type-label underline" href="/privacy">
              Privacy
            </Link>
          </nav>
        </div>
      </footer>
    </>
  );
}
