"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { isMenuItemActive, resolveMenuForContext, type MenuAudience, type MenuContext, type MenuName } from "@/lib/navigation/menu-registry";
import { requestHal } from "@/lib/hal-client";
import { ThemeToggle } from "@/components/theme-toggle";
import { useFeatureFlag } from "@/components/feature-flags-provider";

type MenuNavProps = {
  menu: MenuName;
  audience?: MenuAudience;
  context?: MenuContext;
  variant?: "header" | "footer";
  className?: string;
  scroll?: boolean;
};

export function MenuNav({ menu, audience, context, variant = "header", className, scroll = true }: MenuNavProps) {
  const pathname = usePathname();
  const resolvedContext: MenuContext = context ?? { audience: audience ?? "guest", roles: [] };
  const items = resolveMenuForContext(menu, resolvedContext);
  const [accountBadgeCount, setAccountBadgeCount] = useState<number>(0);
  const showThemeToggle = useFeatureFlag("DARK_MODE_TOGGLE");

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (resolvedContext.audience === "guest") {
        setAccountBadgeCount(0);
        return;
      }

      const result = await requestHal<{ badge_count?: number }>("/api/v1/account/attention");
      if (cancelled) {
        return;
      }

      if (!result.ok) {
        setAccountBadgeCount(0);
        return;
      }

      setAccountBadgeCount(Math.max(0, result.data.badge_count ?? 0));
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [resolvedContext.audience]);

  return (
    <nav aria-label={`${menu} navigation`} className={className}>
      <div
        className={
          variant === "footer"
            ? "flex flex-1 flex-wrap items-center gap-4"
            : "flex min-w-0 flex-1 flex-nowrap items-center gap-4 overflow-x-auto whitespace-nowrap"
        }
      >
        {items.map((item) => {
        const active = isMenuItemActive(item, pathname);
        const isAccount = item.id === "account";
        const badgeCount = isAccount ? accountBadgeCount : 0;

        return (
          <Link
            key={item.id}
            href={item.href}
            scroll={scroll}
            aria-current={active ? "page" : undefined}
            className={
              active
                ? "motion-base text-text-primary underline decoration-current"
                : "motion-base underline decoration-transparent hover:text-text-primary hover:decoration-current"
            }
            prefetch
          >
            <span className="inline-flex items-center gap-1">
              <span>{item.label}</span>
              {isAccount ? (
                <span
                  aria-hidden={badgeCount === 0}
                  className={
                    badgeCount === 0
                      ? "invisible inline-flex min-w-5 items-center justify-center rounded-sm px-1.5 py-0.5 text-xs font-medium"
                      : "inline-flex min-w-5 items-center justify-center rounded-sm bg-state-danger px-1.5 py-0.5 text-xs font-medium text-white"
                  }
                >
                  {badgeCount}
                </span>
              ) : null}
            </span>
          </Link>
        );
        })}
      </div>
      {variant === "header" ? <div className="shrink-0 size-9">{showThemeToggle ? <ThemeToggle /> : null}</div> : null}
    </nav>
  );
}
