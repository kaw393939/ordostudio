"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  LayoutDashboard,
  MessageSquare,
  Users,
  ClipboardList,
  ListChecks,
  ScrollText,
  Settings,
  Menu,
  Plus,
  Search,
} from "lucide-react";

import { MenuNav } from "@/components/navigation/menu-nav";
import { Button } from "@/components/primitives";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import { requestHal } from "@/lib/hal-client";
import { isMenuItemActive, resolveMenuForContext, type MenuAudience, type MenuContext, type MenuItem } from "@/lib/navigation/menu-registry";

type AdminShellProps = {
  audience: MenuAudience;
  roles: readonly string[];
  environmentLabel: string;
  children: React.ReactNode;
};

type CommandEvent = {
  slug: string;
  title: string;
};

const iconForAdminMenuItem = (item: MenuItem) => {
  switch (item.id) {
    case "admin-home":
      return LayoutDashboard;
    case "admin-deals":
      return ClipboardList;
    case "admin-events":
      return CalendarDays;
    case "admin-registrations":
      return ClipboardList;
    case "admin-engagements":
      return ListChecks;
    case "admin-audit":
      return ScrollText;
    case "admin-users":
      return Users;
    case "admin-settings":
      return Settings;
    case "admin-chat":
      return MessageSquare;
    default:
      return LayoutDashboard;
  }
};

export function AdminShell({ audience, roles, environmentLabel, children }: AdminShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [events, setEvents] = useState<CommandEvent[]>([]);

  const isSuperAdmin = roles.includes("SUPER_ADMIN");
  const isMaestro = roles.includes("MAESTRO");
  const isAdmin = roles.includes("ADMIN") || isSuperAdmin;

  const menuContext = useMemo<MenuContext>(() => ({ audience, roles }), [audience, roles]);
  const adminQuickItems = useMemo(() => resolveMenuForContext("adminHeaderQuick", menuContext), [menuContext]);
  const adminMenuItems = useMemo(() => resolveMenuForContext("adminPrimary", menuContext), [menuContext]);

  const sidebarMenuItems = useMemo(() => {
    if (isSuperAdmin || isMaestro) {
      return adminMenuItems;
    }

    if (isAdmin) {
      const dailyIds = new Set([
        "admin-home",
        "admin-deals",
        "admin-intake",
        "admin-events",
        "admin-ledger",
        "admin-newsletter",
        "admin-users",
        "admin-audit",
      ]);
      return adminMenuItems.filter((item) => dailyIds.has(item.id));
    }

    return adminMenuItems;
  }, [adminMenuItems, isAdmin, isMaestro, isSuperAdmin]);

  const paletteQuickItems = useMemo(() => {
    if (adminQuickItems.length > 0) {
      return adminQuickItems;
    }
    return adminMenuItems.slice(0, 6);
  }, [adminMenuItems, adminQuickItems]);

  const paletteAllPages = useMemo(() => {
    const quickIds = new Set(paletteQuickItems.map((item) => item.id));
    return adminMenuItems.filter((item) => !quickIds.has(item.id));
  }, [adminMenuItems, paletteQuickItems]);

  const sidebarGroups = useMemo(() => {
    if (!isSuperAdmin && !isMaestro) {
      return [{ label: "Daily", openByDefault: true, items: sidebarMenuItems }].filter((group) => group.items.length > 0);
    }

    const pick = (wanted: string[]) => sidebarMenuItems.filter((item) => wanted.includes(item.id));

    const core = pick(["admin-home", "admin-deals", "admin-intake"]);
    const programs = pick(["admin-events", "admin-registrations", "admin-engagements", "admin-offers", "admin-commercial"]);
    const money = pick(["admin-ledger"]);
    const people = pick(["admin-apprentices", "admin-field-reports", "admin-referrals", "admin-newsletter", "admin-users"]);
    const system = pick(["admin-measurement", "admin-flywheel", "admin-entitlements", "admin-telemetry", "admin-agent-ops", "admin-settings", "admin-audit"]);

    const groupedIds = new Set([...core, ...programs, ...money, ...people, ...system].map((item) => item.id));
    const remaining = sidebarMenuItems.filter((item) => !groupedIds.has(item.id));

    return [
      { label: "Core", openByDefault: true, items: core },
      { label: "Programs", openByDefault: false, items: programs },
      { label: "Money", openByDefault: false, items: money },
      { label: "People", openByDefault: false, items: people },
      { label: "System", openByDefault: false, items: system },
      { label: "More", openByDefault: false, items: remaining },
    ].filter((group) => group.items.length > 0);
  }, [isMaestro, isSuperAdmin, sidebarMenuItems]);

  useEffect(() => {
    const titleForPath = (path: string): string => {
      if (path === "/admin") return "Admin • Dashboard";
      if (path.startsWith("/admin/deals")) return "Admin • Deals";
      if (path.startsWith("/admin/events")) return "Admin • Events";
      if (path.startsWith("/admin/users")) return "Admin • Users";
      if (path.startsWith("/admin/registrations")) return "Admin • Registrations";
      if (path.startsWith("/admin/engagements")) return "Admin • Engagements";
      if (path.startsWith("/admin/audit")) return "Admin • Audit Log";
      if (path.startsWith("/admin/intake")) return "Admin • Intake";
      if (path.startsWith("/admin/commercial")) return "Admin • Commercial";
      if (path.startsWith("/admin/offers")) return "Admin • Services";
      if (path.startsWith("/admin/settings")) return "Admin • Settings";
      return "Admin";
    };

    document.title = titleForPath(pathname);
  }, [pathname]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const isK = event.key.toLowerCase() === "k";
      const modifier = event.metaKey || event.ctrlKey;
      if (modifier && isK) {
        event.preventDefault();
        setPaletteOpen(true);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!paletteOpen) {
      return;
    }

    let cancelled = false;
    const load = async () => {
      const result = await requestHal<{ items?: Array<{ slug: string; title: string }> }>("/api/v1/events?limit=25&offset=0");
      if (cancelled) {
        return;
      }
      if (!result.ok) {
        setEvents([]);
        return;
      }
      setEvents((result.data.items ?? []).map((item) => ({ slug: item.slug, title: item.title })));
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [paletteOpen]);

  const go = (href: string) => {
    setPaletteOpen(false);
    setSidebarOpen(false);
    router.push(href, { scroll: false });
  };

  const sidebarNav = (
    <>
      <nav className="space-y-3">
        {sidebarGroups.map((group) => (
          <details key={group.label} open={group.openByDefault}>
            <summary className="cursor-pointer select-none type-meta text-text-muted">{group.label}</summary>
            <div className="mt-2 space-y-1">
              {group.items.map((item) => {
                const active = isMenuItemActive(item, pathname);
                const Icon = iconForAdminMenuItem(item);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={
                      active
                        ? "motion-base flex items-center gap-2 rounded-sm bg-action-secondary px-2 py-2 type-label text-text-primary"
                        : "motion-base flex items-center gap-2 rounded-sm px-2 py-2 type-label text-text-secondary hover:bg-action-secondary hover:text-text-primary"
                    }
                    aria-current={active ? "page" : undefined}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <Icon className="size-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </details>
        ))}
      </nav>
      <div className="mt-4 border-t border-border-default pt-3">
        <p className="type-meta text-text-muted">Tip: Press Cmd+K to search admin pages.</p>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-surface">
      <header className="sticky top-0 z-40 border-b border-border-default bg-elevated">
        <div className="border-b border-border-default/60">
          <div className="container-grid flex items-center justify-between gap-4 py-2">
            <div className="flex items-center gap-3">
              <Button
                intent="secondary"
                className="md:hidden"
                onClick={() => setSidebarOpen((current) => !current)}
                aria-label="Toggle admin sidebar"
              >
                <Menu className="size-4" />
              </Button>

              <Link href="/" className="type-label text-text-primary" aria-label="Studio Ordo home">
                Studio Ordo
              </Link>
            </div>

            <div className="flex items-center gap-2 type-meta">
              <button
                type="button"
                className="motion-base inline-flex items-center gap-2 rounded-sm border border-border-default bg-action-secondary px-2 py-1 text-text-secondary hover:text-text-primary"
                onClick={() => setPaletteOpen(true)}
                aria-label="Open command palette"
              >
                <Search className="size-4" />
                <span className="hidden sm:inline">Cmd+K</span>
              </button>
              <span className="rounded-sm border border-border-default bg-action-secondary px-2 py-1 text-text-secondary">
                {environmentLabel}
              </span>
            </div>
          </div>
        </div>

        <div className="container-grid py-2">
          <MenuNav
            menu="publicHeader"
            context={menuContext}
            className="min-w-0 flex items-center gap-4 type-label text-text-secondary"
          />
        </div>

        <div className="border-t border-border-default/60 md:hidden">
          <div className="container-grid py-1">
            <MenuNav
              menu="adminHeaderQuick"
              context={menuContext}
              className="flex flex-wrap items-center gap-3 type-meta text-text-muted"
            />
          </div>
        </div>
      </header>

      {sidebarOpen ? (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          aria-hidden="true"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}

      <aside
        className={
          sidebarOpen
            ? "fixed inset-y-0 left-0 z-50 w-[18rem] overflow-auto border-r border-border-default bg-surface p-3 md:hidden"
            : "hidden"
        }
        aria-label="Admin sidebar"
      >
        <div className="flex items-center justify-between gap-2 pb-2">
          <p className="type-label text-text-primary">Menu</p>
          <Button intent="secondary" size="sm" onClick={() => setSidebarOpen(false)} aria-label="Close admin sidebar">
            Close
          </Button>
        </div>
        {sidebarNav}
      </aside>

      <div className="container-grid admin-shell-grid grid items-start gap-4 py-6">
        <aside
          className="surface hidden rounded-sm border border-border-default p-3 md:sticky md:top-32 md:block md:max-h-[calc(100vh-9rem)] md:overflow-auto"
          aria-label="Admin sidebar"
        >
          {sidebarNav}
        </aside>

        <div className="min-w-0 admin-content">{children}</div>
      </div>

      <CommandDialog open={paletteOpen} onOpenChange={setPaletteOpen}>
        <CommandInput placeholder="Type a command or search events…" />
        <CommandList>
          <CommandEmpty>No results.</CommandEmpty>

          <CommandGroup heading="Quick">
            {paletteQuickItems.map((item) => {
              const Icon = iconForAdminMenuItem(item);
              return (
                <CommandItem key={item.id} onSelect={() => go(item.href)}>
                  <Icon className="size-4" />
                  {item.label}
                </CommandItem>
              );
            })}
          </CommandGroup>

          {paletteAllPages.length > 0 ? (
            <>
              <CommandSeparator />
              <CommandGroup heading="All pages">
                {paletteAllPages.map((item) => {
                  const Icon = iconForAdminMenuItem(item);
                  return (
                    <CommandItem key={item.id} onSelect={() => go(item.href)}>
                      <Icon className="size-4" />
                      {item.label}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </>
          ) : null}

          <CommandSeparator />

          <CommandGroup heading="Actions">
            <CommandItem
              onSelect={() => {
                go("/admin/events#create");
              }}
            >
              <Plus className="size-4" />
              Create event
            </CommandItem>
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Events">
            {events.slice(0, 25).map((event) => (
              <CommandItem key={event.slug} onSelect={() => go(`/admin/events/${event.slug}`)}>
                <CalendarDays className="size-4" />
                {event.title}
                <span className="ml-auto type-meta text-text-muted">{event.slug}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>

      <footer className="border-t border-border-default bg-elevated">
        <div className="container-grid flex flex-wrap items-center justify-between gap-3 py-6">
          <p className="type-meta text-text-muted">Admin</p>
          <MenuNav
            menu="publicFooter"
            context={menuContext}
            variant="footer"
            className="flex flex-wrap items-center gap-3 type-label text-text-secondary"
          />
        </div>
      </footer>
    </div>
  );
}
