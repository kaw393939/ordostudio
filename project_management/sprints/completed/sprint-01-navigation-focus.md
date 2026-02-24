# Sprint 1: Navigation & Focus Management Fixes

## Use Case
As a user navigating the platform, I want page transitions to be smooth and predictable, without the screen unexpectedly jumping to the bottom or losing focus, so that I can comfortably read and interact with the content.

## Personas Addressed
- **All Users (Public, Authenticated, Admin)**: Everyone experiences page transitions and relies on stable layouts.

## Acceptance Criteria
1.  Navigating between pages does not cause the viewport to jump to the bottom of the new page.
2.  Focus is managed correctly on route changes (e.g., focus resets to the top of the document or a specific main content area, not a random element).
3.  `autoFocus` is removed from all standard page inputs and restricted only to explicit modal/dialog interactions.
4.  The `tabIndex={-1}` on `<main id="main-content">` in `PageShell` is evaluated and removed if it conflicts with Next.js App Router's built-in focus management.

## TDD Plan

### 1. Remove Conflicting `tabIndex`
- **Test (Negative)**: With `tabIndex={-1}` on `<main>`, clicking a link causes the browser to scroll down to focus the main element, bypassing the header.
- **Test (Positive)**: Removing `tabIndex={-1}` allows Next.js to handle scroll restoration naturally, keeping the viewport at the top of the page.
- **Implementation**: Edit `src/components/page-shell.tsx` (or equivalent) to remove `tabIndex={-1}` from the `<main>` tag.

### 2. Audit `MenuNav` and `Link` Scroll Behavior
- **Test (Negative)**: A `<Link>` component with `scroll={false}` causes the new page to render at the previous page's scroll position.
- **Test (Positive)**: All standard navigation links use default Next.js behavior (`scroll={true}` implicitly) to ensure the user starts at the top of the new page.
- **Implementation**: Search the codebase for `<Link` and `MenuNav` usages. Remove `scroll={false}` unless explicitly required for a specific UI pattern (e.g., tab switching within the same page).

### 3. Audit `autoFocus` Usage
- **Test (Negative)**: A page loads and immediately scrolls down to focus an input field halfway down the page.
- **Test (Positive)**: Pages load at the top. Only inputs inside newly opened modals/dialogs receive `autoFocus`.
- **Implementation**: Search the codebase for `autoFocus`. Remove it from standard page components (like login/register forms) and ensure it's only used in `Dialog` or `Modal` components.

### 4. Playwright E2E Tests
- **Test (Positive)**: Write a Playwright test that navigates from the home page to the dashboard, then to the settings page, asserting that `window.scrollY` is `0` after each navigation.