import { z } from "zod";

export type MenuName = "publicPrimary" | "adminPrimary";
export type MenuAudience = "guest" | "user" | "admin";

export type MenuItem = {
  id: string;
  label: string;
  href: string;
  match: "exact" | "prefix";
  includeInSitemap?: boolean;
  audience?: readonly MenuAudience[];
};

const menuAudienceSchema = z.enum(["guest", "user", "admin"]);

const menuItemSchema = z.object({
  id: z.string().trim().min(1),
  label: z.string().trim().min(1),
  href: z.string().trim().min(1).startsWith("/"),
  match: z.enum(["exact", "prefix"]),
  includeInSitemap: z.boolean().optional(),
  audience: z.array(menuAudienceSchema).nonempty().optional(),
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
  publicPrimary: registerMenu("publicPrimary", [
    { id: "home", label: "Home", href: "/", match: "exact", includeInSitemap: true },
    { id: "training", label: "Training", href: "/services", match: "prefix", includeInSitemap: true },
    { id: "studio", label: "Studio", href: "/studio", match: "exact", includeInSitemap: true },
    { id: "apprentices", label: "Apprentices", href: "/apprentices", match: "prefix", includeInSitemap: true },
    { id: "insights", label: "Insights", href: "/insights", match: "exact", includeInSitemap: true },
    { id: "about", label: "About", href: "/about", match: "exact", includeInSitemap: true },
    { id: "book", label: "Book consult", href: "/services/request", match: "exact", includeInSitemap: true },
    { id: "login", label: "Login", href: "/login", match: "exact", audience: ["guest"] },
    { id: "account", label: "Account", href: "/account", match: "exact", audience: ["user", "admin"] },
  ]),
  adminPrimary: registerMenu("adminPrimary", [
    { id: "admin-home", label: "Admin Console", href: "/admin", match: "exact", audience: ["admin"] },
    { id: "admin-events", label: "Events", href: "/admin/events", match: "prefix", audience: ["admin"] },
    { id: "admin-offers", label: "Offers", href: "/admin/offers", match: "prefix", audience: ["admin"] },
    { id: "admin-intake", label: "Intake", href: "/admin/intake", match: "prefix", audience: ["admin"] },
    { id: "admin-measurement", label: "Measurement", href: "/admin/measurement", match: "exact", audience: ["admin"] },
    { id: "admin-ledger", label: "Ledger", href: "/admin/ledger", match: "prefix", audience: ["admin"] },
    { id: "admin-entitlements", label: "Entitlements", href: "/admin/entitlements", match: "prefix", audience: ["admin"] },
    { id: "admin-apprentices", label: "Apprentices", href: "/admin/apprentices", match: "prefix", audience: ["admin"] },
    { id: "admin-field-reports", label: "Field reports", href: "/admin/field-reports", match: "prefix", audience: ["admin"] },
    { id: "admin-referrals", label: "Referrals", href: "/admin/referrals", match: "prefix", audience: ["admin"] },
    { id: "admin-newsletter", label: "Newsletter", href: "/admin/newsletter", match: "prefix", audience: ["admin"] },
    { id: "admin-commercial", label: "Commercial", href: "/admin/commercial", match: "prefix", audience: ["admin"] },
    { id: "admin-users", label: "Users", href: "/admin/users", match: "exact", audience: ["admin"] },
    { id: "admin-audit", label: "Audit", href: "/admin/audit", match: "exact", audience: ["admin"] },
  ]),
};

export const getMenu = (name: MenuName): readonly MenuItem[] => menus[name];

export const filterMenuForAudience = (items: readonly MenuItem[], audience: MenuAudience): MenuItem[] =>
  items.filter((item) => !item.audience || item.audience.includes(audience));

export const resolveMenu = (name: MenuName, audience: MenuAudience): MenuItem[] =>
  filterMenuForAudience(getMenu(name), audience);

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
  filterMenuForAudience(menus.publicPrimary, "guest")
    .filter((item) => item.includeInSitemap)
    .map((item) => item.href);
