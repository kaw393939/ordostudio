"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  LayoutDashboard,
  Users,
  ClipboardList,
  ListChecks,
  ScrollText,
  Briefcase,
  Handshake,
  Settings,
  Menu,
  Plus,
  Search,
} from "lucide-react";

import { MenuNav } from "@/components/navigation/menu-nav";
import { Button } from "@/components/primitives";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator, CommandShortcut } from "@/components/ui/command";
import { requestHal } from "@/lib/hal-client";
import type { MenuAudience } from "@/lib/navigation/menu-registry";

type AdminShellProps = {
  audience: MenuAudience;
  environmentLabel: string;
  children: React.ReactNode;
};

type CommandEvent = {
  slug: string;
  title: string;
};

const isActive = (pathname: string, href: string): boolean => {
  if (href === "/admin") {
    return pathname === "/admin";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
};

export function AdminShell({ audience, environmentLabel, children }: AdminShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [events, setEvents] = useState<CommandEvent[]>([]);

  useEffect(() => {
    const titleForPath = (path: string): string => {
      if (path === "/admin") return "Admin • Dashboard";
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

  const navItems = useMemo(
    () =>
      [
        { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
        { href: "/admin/events", label: "Events", icon: CalendarDays },
        { href: "/admin/users", label: "Users", icon: Users },
        { href: "/admin/registrations", label: "Registrations", icon: ClipboardList },
        { href: "/admin/engagements", label: "Engagements", icon: ListChecks },
        { href: "/admin/audit", label: "Audit Log", icon: ScrollText },
        { href: "/services", label: "Services", icon: Briefcase },
        { href: "/admin/intake", label: "Intake", icon: Handshake },
        { href: "/admin/commercial", label: "Commercial", icon: Handshake },
        { href: "/admin/settings", label: "Settings", icon: Settings },
      ] as const,
    [],
  );

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
    router.push(href);
  };

  return (
    <div className="min-h-screen bg-surface">
      <header className="border-b border-border-default bg-elevated">
        <div className="container-grid flex items-center justify-between gap-4 py-4">
          <div className="flex items-center gap-3">
            <Button
              intent="secondary"
              className="md:hidden"
              onClick={() => setSidebarOpen((current) => !current)}
              aria-label="Toggle admin sidebar"
            >
              <Menu className="size-4" />
            </Button>
            <MenuNav
              menu="adminPrimary"
              audience={audience}
              className="hidden items-center gap-4 type-label text-text-secondary md:flex"
            />
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
            <span className="rounded-sm border border-border-default bg-action-secondary px-2 py-1 text-text-primary">
              Admin
            </span>
            <span className="rounded-sm border border-border-default bg-action-secondary px-2 py-1 text-text-secondary">
              {environmentLabel}
            </span>
          </div>
        </div>
      </header>

      <div className="container-grid grid grid-cols-1 gap-4 py-6 md:grid-cols-[16rem,1fr]">
        <aside
          className={`surface rounded-sm border border-border-default p-3 md:block ${sidebarOpen ? "block" : "hidden"}`}
          aria-label="Admin sidebar"
        >
          <nav className="space-y-1">
            {navItems.map((item) => {
              const active = isActive(pathname, item.href);
              const Icon = item.icon;
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
          </nav>
          <div className="mt-4 border-t border-border-default pt-3">
            <p className="type-meta text-text-muted">Tip: Press Cmd+K to search admin pages.</p>
          </div>
        </aside>

        <div>{children}</div>
      </div>

      <CommandDialog open={paletteOpen} onOpenChange={setPaletteOpen}>
        <CommandInput placeholder="Type a command or search events…" />
        <CommandList>
          <CommandEmpty>No results.</CommandEmpty>

          <CommandGroup heading="Navigation">
            <CommandItem onSelect={() => go("/admin/events")}>
              <CalendarDays className="size-4" />
              Events
              <CommandShortcut>G E</CommandShortcut>
            </CommandItem>
            <CommandItem onSelect={() => go("/admin/users")}>
              <Users className="size-4" />
              Users
              <CommandShortcut>G U</CommandShortcut>
            </CommandItem>
            <CommandItem onSelect={() => go("/admin/audit")}>
              <ScrollText className="size-4" />
              Audit Log
              <CommandShortcut>G A</CommandShortcut>
            </CommandItem>
          </CommandGroup>

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
    </div>
  );
}
