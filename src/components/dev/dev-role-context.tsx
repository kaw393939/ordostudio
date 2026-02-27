"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

interface DevRoleState {
  roleOverride: string[] | null;
  isOverrideActive: boolean;
  setRoleOverride: (roles: string[]) => void;
  clearOverride: () => void;
}

const DevRoleContext = createContext<DevRoleState>({
  roleOverride: null,
  isOverrideActive: false,
  setRoleOverride: () => {},
  clearOverride: () => {},
});

export const useDevRole = () => useContext(DevRoleContext);

export function DevRoleProvider({ children }: { children: ReactNode }) {
  const [roleOverride, setRoles] = useState<string[] | null>(null);

  const setRoleOverride = useCallback((roles: string[]) => setRoles(roles), []);
  const clearOverride = useCallback(() => setRoles(null), []);

  return (
    <DevRoleContext.Provider
      value={{
        roleOverride,
        isOverrideActive: roleOverride !== null,
        setRoleOverride,
        clearOverride,
      }}
    >
      {children}
    </DevRoleContext.Provider>
  );
}

/**
 * Drop-in replacement for hasRequiredRole that respects dev role overlay.
 * Use this in client components that need role gating.
 */
export function useHasRequiredRole(
  actualRoles: readonly string[],
  requiredRoles: readonly string[],
): boolean {
  const { roleOverride, isOverrideActive } = useDevRole();
  const effectiveRoles = isOverrideActive ? roleOverride ?? [] : actualRoles;
  return requiredRoles.some((r) => effectiveRoles.includes(r));
}
