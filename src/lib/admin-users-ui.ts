export const MUTABLE_ROLES = ["AFFILIATE", "APPRENTICE", "MAESTRO", "ADMIN"] as const;

type UserFilterInput = {
  search?: string;
  status?: string;
  role?: string;
};

export const buildUsersListHref = (filters: UserFilterInput) => {
  const query = new URLSearchParams();

  if (filters.search && filters.search.trim().length > 0) {
    query.set("search", filters.search.trim());
  }

  if (filters.status && filters.status.trim().length > 0) {
    query.set("status", filters.status.trim());
  }

  if (filters.role && filters.role.trim().length > 0) {
    query.set("role", filters.role.trim());
  }

  const queryString = query.toString();
  return queryString.length > 0 ? `/api/v1/users?${queryString}` : "/api/v1/users";
};

export const normalizeRoles = (roles: string[]) => {
  return roles.map((role) => role.toUpperCase());
};

export const canAddRole = (roles: string[], role: string) => {
  const current = normalizeRoles(roles);
  return !current.includes(role.toUpperCase());
};

export const canRemoveRole = (roles: string[], role: string) => {
  const current = normalizeRoles(roles);
  return current.includes(role.toUpperCase());
};
