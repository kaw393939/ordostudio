import { cookies } from "next/headers";
import { getSessionUserFromRequest } from "@/lib/api/auth";
import type { MenuAudience, MenuContext } from "@/lib/navigation/menu-registry";

const hasAdminRole = (roles: readonly string[]): boolean =>
  roles.includes("ADMIN") || roles.includes("SUPER_ADMIN") || roles.includes("MAESTRO");

export const getMenuContext = async (): Promise<MenuContext> => {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");

  if (!cookieHeader) {
    return { audience: "guest", roles: [] };
  }

  const request = new Request("http://localhost/internal/menu-context", {
    headers: {
      cookie: cookieHeader,
    },
  });

  const user = getSessionUserFromRequest(request);
  if (!user) {
    return { audience: "guest", roles: [] };
  }

  const roles = [...(user.roles ?? [])];
  if (hasAdminRole(roles)) {
    return { audience: "admin", roles };
  }

  return { audience: "user", roles };
};

export const getMenuAudience = async (): Promise<MenuAudience> => {
  const context = await getMenuContext();
  return context.audience;
};