"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import { MenuNav } from "@/components/navigation/menu-nav";
import type { MenuContext } from "@/lib/navigation/menu-registry";

type MobileNavDrawerProps = {
  context: MenuContext;
};

export function MobileNavDrawer({ context }: MobileNavDrawerProps) {
  const [open, setOpen] = useState(false);
  const isLoggedIn = context.audience !== "guest";

  return (
    <>
      <button
        type="button"
        className="inline-flex items-center justify-center rounded-sm p-2 text-text-secondary hover:bg-action-secondary hover:text-text-primary md:hidden"
        onClick={() => setOpen(true)}
        aria-label="Open navigation menu"
      >
        <Menu className="size-5" />
      </button>

      {open ? (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 md:hidden"
            aria-hidden="true"
            onClick={() => setOpen(false)}
          />
          <aside
            className="fixed inset-y-0 left-0 z-50 w-[18rem] overflow-auto border-r border-border-subtle bg-surface p-4 md:hidden"
            aria-label="Mobile navigation"
          >
            <div className="flex items-center justify-between pb-4 border-b border-border-subtle">
              <p className="type-label text-text-primary">Menu</p>
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-sm p-2 text-text-secondary hover:bg-action-secondary hover:text-text-primary"
                onClick={() => setOpen(false)}
                aria-label="Close navigation menu"
              >
                <X className="size-5" />
              </button>
            </div>

            {isLoggedIn ? (
              <div className="mt-4 pb-4 border-b border-border-subtle" onClick={() => setOpen(false)}>
                <p className="mb-2 px-2 type-meta text-text-muted uppercase tracking-wider">Account</p>
                <MenuNav
                  menu="userAccount"
                  context={context}
                  variant="sidebar"
                  className="type-label text-text-secondary"
                />
              </div>
            ) : null}

            <div className="mt-4" onClick={() => setOpen(false)}>
              {isLoggedIn ? (
                <p className="mb-2 px-2 type-meta text-text-muted uppercase tracking-wider">Browse</p>
              ) : null}
              <MenuNav
                menu="publicHeader"
                context={context}
                variant="sidebar"
                className="type-label text-text-secondary"
              />
            </div>
            <div className="mt-6 pt-4 border-t border-border-subtle" onClick={() => setOpen(false)}>
              <MenuNav
                menu="publicFooter"
                context={context}
                variant="sidebar"
                className="type-label text-text-secondary"
              />
            </div>
          </aside>
        </>
      ) : null}
    </>
  );
}
