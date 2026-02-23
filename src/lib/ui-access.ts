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
