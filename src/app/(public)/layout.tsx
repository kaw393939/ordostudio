import { MenuNav } from "@/components/navigation/menu-nav";
import { MobileNavDrawer } from "@/components/navigation/mobile-nav-drawer";
import { UserMenu } from "@/components/navigation/user-menu";
import { getMenuContext } from "@/lib/navigation/menu-audience";
import Link from "next/link";
import { FloatingChatGate } from "@/components/chat/floating-chat-gate";

export default async function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const context = await getMenuContext();
  const isLoggedIn = context.audience !== "guest";

  return (
    <>
      <header className="border-b border-border-subtle bg-surface">
        <div className="border-b border-border-subtle/60">
          <div className="container-grid flex items-center justify-between gap-4 py-2">
            <Link href="/" className="motion-base shrink-0 type-label text-text-primary" aria-label="Studio Ordo home">
              Studio Ordo
            </Link>
            <div className="flex items-center gap-3">
              {isLoggedIn ? (
                <div className="hidden items-center gap-3 md:flex">
                  <UserMenu />
                </div>
              ) : null}
              <MobileNavDrawer context={context} />
            </div>
          </div>
        </div>

        <div className="container-grid hidden py-2 md:block">
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
      <FloatingChatGate />
    </>
  );
}
