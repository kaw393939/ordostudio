"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * Announces route changes to assistive technologies via an `aria-live` region.
 *
 * On each navigation (pathname change), the component:
 * 1. Updates its text content with the new path
 * 2. Programmatically moves focus to the live region so screen readers pick it up
 *
 * The element is visually hidden (sr-only) but remains in the accessibility tree.
 */
export function RouteAnnouncer() {
  const pathname = usePathname();
  const ref = useRef<HTMLDivElement>(null);
  const previousPathname = useRef(pathname);

  useEffect(() => {
    // Only announce when pathname actually changes (not on initial mount)
    if (previousPathname.current !== pathname) {
      previousPathname.current = pathname;
      const node = ref.current;
      if (!node) return;

      try {
        // Avoid scroll jumps when focusing an off-screen sr-only element.
        node.focus({ preventScroll: true });
      } catch {
        node.focus();
      }
    }
  }, [pathname]);

  return (
    <div
      ref={ref}
      tabIndex={-1}
      role="status"
      aria-live="assertive"
      aria-atomic="true"
      className="sr-only"
    >
      {`Navigated to ${pathname}`}
    </div>
  );
}
