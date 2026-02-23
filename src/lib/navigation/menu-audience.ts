import { cookies } from "next/headers";
import { getSessionUserFromRequest } from "@/lib/api/auth";
import type { MenuAudience } from "@/lib/navigation/menu-registry";

const hasAdminRole = (roles: readonly string[]): boolean =>
  roles.includes("ADMIN") || roles.includes("SUPER_ADMIN");

export const getMenuAudience = async (): Promise<MenuAudience> => {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");

  if (!cookieHeader) {
    return "guest";
  }

  const request = new Request("http://localhost/internal/menu-audience", {
    headers: {
      cookie: cookieHeader,
    },
  });

  const user = getSessionUserFromRequest(request);
  if (!user) {
    return "guest";
  }

  if (hasAdminRole(user.roles)) {
    return "admin";
  }

  return "user";
};