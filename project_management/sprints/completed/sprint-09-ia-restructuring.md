# Sprint 9: Left-Hand Menu & IA Restructuring

## Use Case
As a user navigating the platform, I want the global navigation and left-hand menu to be intuitive, role-aware, and context-sensitive, so that I can easily find the tools and information relevant to my current task and role.

## Personas Addressed
- **All Users (Public, Authenticated, Admin)**: Everyone relies on the navigation to move through the platform.

## Acceptance Criteria
1.  The `menu-registry.ts` is updated to reflect the new Information Architecture (IA).
2.  The `MenuNav` component is redesigned for the sidebar/left-hand menu to support nested routes and clear active states.
3.  Navigation items are dynamically rendered based on the user's role and available HAL links.
4.  The mobile navigation drawer/hamburger menu is optimized for touch interactions.

## TDD Plan

### 1. Update `menu-registry.ts`
- **Test (Positive)**: The `menu-registry.ts` file defines a clear hierarchy of navigation items, including top-level categories (e.g., "Dashboard", "Training", "Admin") and nested sub-items.
- **Test (Positive)**: Each navigation item includes metadata for role requirements (e.g., `roles: ["ADMIN"]`) or required HAL links.
- **Test (Positive)**: The registry includes Phase 5 routes (`/settings/billing`, `/admin/telemetry`, `/admin/agent-ops`) with appropriate role gating.
- **Implementation**: Refactor `src/lib/menu-registry.ts` to structure the navigation data according to the new IA plan.

### 2. Redesign `MenuNav` Component
- **Test (Positive)**: The `MenuNav` component renders a vertical list of links for the sidebar.
- **Test (Positive)**: Nested routes are displayed with indentation or a collapsible accordion pattern.
- **Test (Positive)**: The currently active route is visually highlighted (e.g., with a distinct background color or bold text).
- **Implementation**: Update `src/components/navigation/menu-nav.tsx` to support the new hierarchical structure and active state styling.

### 3. Dynamic Rendering based on Role/HAL Links
- **Test (Negative)**: A user with only the `USER` role does not see the "Admin" category in the navigation menu.
- **Test (Positive)**: A user with the `ADMIN` role sees the "Admin" category and its sub-items.
- **Test (Positive)**: If a specific HAL link is missing from the API root, the corresponding navigation item is hidden or disabled.
- **Implementation**: Update the logic that consumes `menu-registry.ts` to filter items based on the user's session roles and the available HAL links fetched from the API root.

### 4. Optimize Mobile Navigation
- **Test (Positive)**: On mobile viewports, the sidebar is hidden by default and accessible via a hamburger menu icon.
- **Test (Positive)**: The mobile drawer opens smoothly and provides large, touch-friendly targets for all navigation links.
- **Implementation**: Update the layout components (e.g., `PageShell`, `AdminShell`) to implement a responsive drawer pattern for the navigation menu on smaller screens.