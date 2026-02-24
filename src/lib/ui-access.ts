import { follow, HalResource } from "./hal-client";

export const canAccessAdminFromMe = (resource: HalResource): boolean => {
  return follow(resource, "admin") !== null;
};

export const adminAccessProblem = {
  type: "https://lms-219.dev/problems/forbidden",
  title: "Forbidden",
  status: 403,
  detail: "Admin access requires admin affordance from /api/v1/me.",
} as const;

/**
 * Checks whether the given roles include at least one of the required roles.
 * Use this to gate SUPER_ADMIN-only pages at the component level.
 */
export const hasRequiredRole = (
  userRoles: readonly string[],
  requiredRoles: readonly string[],
): boolean => {
  return requiredRoles.some((r) => userRoles.includes(r));
};

export const roleAccessProblem = (required: readonly string[]) =>
  ({
    type: "https://lms-219.dev/problems/forbidden",
    title: "Forbidden",
    status: 403,
    detail: `This page requires one of the following roles: ${required.join(", ")}.`,
  }) as const;
