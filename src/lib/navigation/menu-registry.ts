import { z } from "zod";

export type MenuName = "publicHeader" | "publicFooter" | "adminHeaderQuick" | "adminPrimary";
export type MenuAudience = "guest" | "user" | "admin";

export type MenuContext = {
  audience: MenuAudience;
  roles: readonly string[];
};

export type MenuItem = {
  id: string;
  label: string;
  href: string;
  match: "exact" | "prefix";
  includeInSitemap?: boolean;
  audience?: readonly MenuAudience[];
  roles?: readonly string[];
};

const menuAudienceSchema = z.enum(["guest", "user", "admin"]);

const menuItemSchema = z.object({
  id: z.string().trim().min(1),
  label: z.string().trim().min(1),
  href: z.string().trim().min(1).startsWith("/"),
  match: z.enum(["exact", "prefix"]),
  includeInSitemap: z.boolean().optional(),
  audience: z.array(menuAudienceSchema).nonempty().optional(),
  roles: z.array(z.string().trim().min(1)).nonempty().optional(),
});

const assertUnique = (menuName: MenuName, items: readonly MenuItem[]): void => {
  const ids = new Set<string>();
  const hrefs = new Set<string>();

  for (const item of items) {
    if (ids.has(item.id)) {
      throw new Error(`Invalid menu registration for ${menuName}: duplicate id '${item.id}'.`);
    }
    ids.add(item.id);

    if (hrefs.has(item.href)) {
      throw new Error(`Invalid menu registration for ${menuName}: duplicate href '${item.href}'.`);
    }
    hrefs.add(item.href);
  }
};

export const registerMenu = (menuName: MenuName, items: readonly MenuItem[]): readonly MenuItem[] => {
  const parsed = z.array(menuItemSchema).safeParse(items);
  if (!parsed.success) {
    throw new Error(
      `Invalid menu registration for ${menuName}: ${parsed.error.issues
        .map((issue) => `${issue.path.join(".") || "root"}: ${issue.message}`)
        .join("; ")}`,
    );
  }

  assertUnique(menuName, parsed.data);
  return parsed.data;
};

const menus: Record<MenuName, readonly MenuItem[]> = {
  publicHeader: registerMenu("publicHeader", [
    { id: "training", label: "Training", href: "/services", match: "prefix", includeInSitemap: true },
    { id: "events", label: "Events", href: "/events", match: "prefix", includeInSitemap: true },
    { id: "studio", label: "Studio", href: "/studio", match: "exact", includeInSitemap: true },
    { id: "studio-report", label: "Submit report", href: "/studio/report", match: "exact", roles: ["APPRENTICE"], audience: ["user", "admin"] },
    { id: "book", label: "Book consult", href: "/services/request", match: "exact", includeInSitemap: true },
    { id: "login", label: "Login", href: "/login", match: "exact", audience: ["guest"] },
    { id: "account", label: "Dashboard", href: "/account", match: "exact", audience: ["user", "admin"] },
  ]),
  publicFooter: registerMenu("publicFooter", [
    { id: "apprentices", label: "Apprentices", href: "/apprentices", match: "prefix", includeInSitemap: true },
    { id: "affiliate", label: "Affiliates", href: "/affiliate", match: "exact", includeInSitemap: true },
    { id: "insights", label: "Insights", href: "/insights", match: "exact", includeInSitemap: true },
    { id: "about", label: "About", href: "/about", match: "exact", includeInSitemap: true },
    { id: "newsletter", label: "Newsletter", href: "/newsletter", match: "exact", includeInSitemap: true },
    { id: "terms", label: "Terms", href: "/terms", match: "exact", includeInSitemap: true },
    { id: "privacy", label: "Privacy", href: "/privacy", match: "exact", includeInSitemap: true },
  ]),
  adminHeaderQuick: registerMenu("adminHeaderQuick", [
    { id: "admin-home", label: "Admin Console", href: "/admin", match: "exact", audience: ["admin"], roles: ["ADMIN", "SUPER_ADMIN", "MAESTRO"] },
    { id: "admin-deals", label: "Deals", href: "/admin/deals", match: "prefix", audience: ["admin"], roles: ["ADMIN", "SUPER_ADMIN", "MAESTRO"] },
    { id: "admin-intake", label: "Intake", href: "/admin/intake", match: "prefix", audience: ["admin"], roles: ["ADMIN", "SUPER_ADMIN"] },
    { id: "admin-events", label: "Events", href: "/admin/events", match: "prefix", audience: ["admin"], roles: ["ADMIN", "SUPER_ADMIN", "MAESTRO"] },
    { id: "admin-ledger", label: "Ledger", href: "/admin/ledger", match: "prefix", audience: ["admin"], roles: ["ADMIN", "SUPER_ADMIN"] },
  ]),
  adminPrimary: registerMenu("adminPrimary", [
    { id: "admin-home", label: "Admin Console", href: "/admin", match: "exact", audience: ["admin"], roles: ["ADMIN", "SUPER_ADMIN", "MAESTRO"] },
    { id: "admin-deals", label: "Deals", href: "/admin/deals", match: "prefix", audience: ["admin"], roles: ["ADMIN", "SUPER_ADMIN", "MAESTRO"] },

    { id: "admin-events", label: "Events", href: "/admin/events", match: "prefix", audience: ["admin"], roles: ["ADMIN", "SUPER_ADMIN", "MAESTRO"] },
    { id: "admin-registrations", label: "Registrations", href: "/admin/registrations", match: "prefix", audience: ["admin"], roles: ["ADMIN", "SUPER_ADMIN"] },
    { id: "admin-engagements", label: "Engagements", href: "/admin/engagements", match: "prefix", audience: ["admin"], roles: ["ADMIN", "SUPER_ADMIN"] },

    { id: "admin-offers", label: "Offers", href: "/admin/offers", match: "prefix", audience: ["admin"], roles: ["ADMIN", "SUPER_ADMIN"] },
    { id: "admin-intake", label: "Intake", href: "/admin/intake", match: "prefix", audience: ["admin"], roles: ["ADMIN", "SUPER_ADMIN"] },
    { id: "admin-commercial", label: "Commercial", href: "/admin/commercial", match: "prefix", audience: ["admin"], roles: ["ADMIN", "SUPER_ADMIN"] },

    { id: "admin-ledger", label: "Ledger", href: "/admin/ledger", match: "prefix", audience: ["admin"], roles: ["ADMIN", "SUPER_ADMIN"] },
    { id: "admin-measurement", label: "Measurement", href: "/admin/measurement", match: "exact", audience: ["admin"], roles: ["SUPER_ADMIN"] },
    { id: "admin-flywheel", label: "Flywheel", href: "/admin/flywheel", match: "exact", audience: ["admin"], roles: ["SUPER_ADMIN"] },

    { id: "admin-entitlements", label: "Entitlements", href: "/admin/entitlements", match: "prefix", audience: ["admin"], roles: ["SUPER_ADMIN"] },
    { id: "admin-apprentices", label: "Apprentices", href: "/admin/apprentices", match: "prefix", audience: ["admin"], roles: ["ADMIN", "SUPER_ADMIN"] },
    { id: "admin-field-reports", label: "Field reports", href: "/admin/field-reports", match: "prefix", audience: ["admin"], roles: ["ADMIN", "SUPER_ADMIN"] },
    { id: "admin-referrals", label: "Referrals", href: "/admin/referrals", match: "prefix", audience: ["admin"], roles: ["ADMIN", "SUPER_ADMIN"] },
    { id: "admin-newsletter", label: "Newsletter", href: "/admin/newsletter", match: "prefix", audience: ["admin"], roles: ["ADMIN", "SUPER_ADMIN", "MAESTRO"] },

    { id: "admin-users", label: "Users", href: "/admin/users", match: "exact", audience: ["admin"], roles: ["ADMIN", "SUPER_ADMIN"] },
    { id: "admin-settings", label: "Settings", href: "/admin/settings", match: "exact", audience: ["admin"], roles: ["SUPER_ADMIN"] },
    { id: "admin-audit", label: "Audit", href: "/admin/audit", match: "exact", audience: ["admin"], roles: ["ADMIN", "SUPER_ADMIN"] },
  ]),
};

export const getMenu = (name: MenuName): readonly MenuItem[] => menus[name];

export const filterMenuForAudience = (items: readonly MenuItem[], audience: MenuAudience): MenuItem[] =>
  items.filter((item) => !item.audience || item.audience.includes(audience));

export const filterMenuForContext = (items: readonly MenuItem[], context: MenuContext): MenuItem[] => {
  const audienceFiltered = filterMenuForAudience(items, context.audience);
  return audienceFiltered.filter((item) => {
    if (!item.roles || item.roles.length === 0) {
      return true;
    }

    if (!context.roles || context.roles.length === 0) {
      return false;
    }

    return item.roles.some((required) => context.roles.includes(required));
  });
};

export const resolveMenu = (name: MenuName, audience: MenuAudience): MenuItem[] =>
  filterMenuForContext(getMenu(name), { audience, roles: [] });

export const resolveMenuForContext = (name: MenuName, context: MenuContext): MenuItem[] =>
  filterMenuForContext(getMenu(name), context);

export const isMenuItemActive = (item: MenuItem, pathname: string): boolean => {
  if (item.match === "exact") {
    return pathname === item.href;
  }

  if (pathname === item.href) {
    return true;
  }

  return pathname.startsWith(`${item.href}/`);
};

export const getSitemapStaticPaths = (): string[] =>
  Array.from(
    new Set(
      [menus.publicHeader, menus.publicFooter]
        .flatMap((items) => filterMenuForAudience(items, "guest"))
        .filter((item) => item.includeInSitemap)
        .map((item) => item.href),
    ),
  );
