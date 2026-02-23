"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { emitMeasurementEvent } from "@/lib/measurement-client";

const pageViewKeyForPath = (pathname: string): string | null => {
  if (pathname === "/") return "PAGE_VIEW_HOME";
  if (pathname === "/services") return "PAGE_VIEW_SERVICES";
  if (pathname === "/services/request") return "PAGE_VIEW_SERVICES_REQUEST";
  if (pathname.startsWith("/services/")) return "PAGE_VIEW_SERVICE_DETAIL";
  return null;
};

export function MeasurementListener() {
  const pathname = usePathname();
  const lastPathRef = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname) return;
    if (lastPathRef.current === pathname) return;
    lastPathRef.current = pathname;

    const key = pageViewKeyForPath(pathname);
    if (!key) return;

    void emitMeasurementEvent({
      key,
      path: pathname,
    });
  }, [pathname]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const el = target.closest("[data-measure-key]");
      if (!(el instanceof HTMLElement)) return;

      const key = el.dataset.measureKey;
      if (!key) return;

      const href = (el as HTMLAnchorElement).href;

      void emitMeasurementEvent({
        key,
        path: window.location.pathname,
        metadata: href ? { href } : undefined,
      });
    };

    document.addEventListener("click", onClick, { capture: true });
    return () => {
      document.removeEventListener("click", onClick, { capture: true } as unknown as EventListenerOptions);
    };
  }, []);

  return null;
}
