"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { isMenuItemActive, resolveMenuForContext, type MenuContext } from "@/lib/navigation/menu-registry";

type UserSidebarProps = {
  context: MenuContext;
  children: React.ReactNode;
};

export function UserSidebar({ context, children }: UserSidebarProps) {
  const items = resolveMenuForContext("userAccount", context);
  const mainItems = items.filter((i) => i.id !== "logout");

  return (
    <div className="container-grid flex flex-col gap-6 py-6 md:flex-row md:gap-8">
      {/* Desktop sidebar */}
      <aside className="hidden shrink-0 md:block md:w-48" aria-label="Account navigation">
        <SidebarContent mainItems={mainItems} />
      </aside>

      {/* Mobile: top bar with drawer trigger + inline drawer */}
      <MobileUserNav mainItems={mainItems} />

      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}

type SidebarItem = { id: string; label: string; href: string; match: "exact" | "prefix" };

function SidebarContent({ mainItems }: { mainItems: SidebarItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1" aria-label="Account menu">
      {mainItems.map((item) => {
        const active = isMenuItemActive(item, pathname);
        return (
          <Link
            key={item.id}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={
              active
                ? "motion-base rounded-sm bg-action-secondary px-3 py-2 type-label text-text-primary"
                : "motion-base rounded-sm px-3 py-2 type-label text-text-secondary hover:bg-action-secondary hover:text-text-primary"
            }
            prefetch
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function MobileUserNav({ mainItems }: { mainItems: SidebarItem[] }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Find current page label for the trigger button
  const currentItem = mainItems.find((i) => isMenuItemActive(i, pathname));

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between rounded-sm border border-border-subtle bg-surface px-3 py-2 type-label text-text-primary"
        aria-expanded={open}
        aria-controls="mobile-user-nav"
      >
        <span>{currentItem?.label ?? "Menu"}</span>
        {open ? <X className="size-4" /> : <Menu className="size-4" />}
      </button>

      {open ? (
        <nav
          id="mobile-user-nav"
          className="mt-2 rounded-sm border border-border-subtle bg-surface p-2"
          aria-label="Account menu"
          onClick={() => setOpen(false)}
        >
          <div className="flex flex-col gap-1">
            {mainItems.map((item) => {
              const active = isMenuItemActive(item, pathname);
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={
                    active
                      ? "motion-base rounded-sm bg-action-secondary px-3 py-2 type-label text-text-primary"
                      : "motion-base rounded-sm px-3 py-2 type-label text-text-secondary hover:bg-action-secondary hover:text-text-primary"
                  }
                  prefetch
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>
      ) : null}
    </div>
  );
}
