/**
 * RBAC visibility model for content search.
 *
 * Three-tier hierarchy:
 *   PUBLIC < AUTHENTICATED < ADMIN
 *
 * A caller with a given role can see all content whose visibility level is
 * less than or equal to the caller's level.
 */

export type Visibility = "PUBLIC" | "AUTHENTICATED" | "ADMIN";

export const LEVEL: Record<Visibility, number> = {
  PUBLIC: 0,
  AUTHENTICATED: 1,
  ADMIN: 2,
};

/**
 * Return true if a caller with `userRole` is allowed to see content with
 * `contentVisibility`.
 *
 * Anonymous callers (userRole = null) are treated as PUBLIC level 0.
 * Unrecognised role strings also map to level 0.
 */
export function isVisibleTo(
  contentVisibility: Visibility,
  userRole: string | null,
): boolean {
  const userLevel = userRole ? (LEVEL[userRole as Visibility] ?? 0) : 0;
  return LEVEL[contentVisibility] <= userLevel;
}

/**
 * Return the set of Visibility tiers that the given role can access.
 * Used to build the SQL `IN (...)` filter for vector search.
 */
export function visibilityFilter(userRole: string | null): Visibility[] {
  const userLevel = userRole ? (LEVEL[userRole as Visibility] ?? 0) : 0;
  return (Object.keys(LEVEL) as Visibility[]).filter((v) => LEVEL[v] <= userLevel);
}
