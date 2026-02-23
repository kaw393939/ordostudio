"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { isMenuItemActive, resolveMenu, type MenuAudience, type MenuName } from "@/lib/navigation/menu-registry";
import { requestHal } from "@/lib/hal-client";
import { ThemeToggle } from "@/components/theme-toggle";
import { useFeatureFlag } from "@/components/feature-flags-provider";

type MenuNavProps = {
  menu: MenuName;
  audience: MenuAudience;
  className?: string;
};

export function MenuNav({ menu, audience, className }: MenuNavProps) {
  const pathname = usePathname();
  const items = resolveMenu(menu, audience);
  const [accountBadgeCount, setAccountBadgeCount] = useState<number>(0);
  const showThemeToggle = useFeatureFlag("DARK_MODE_TOGGLE");

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (audience === "guest") {
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
  }, [audience]);

  return (
    <nav aria-label={`${menu} navigation`} className={className}>
      <div className="flex flex-1 flex-wrap items-center gap-4">
        {items.map((item) => {
        const active = isMenuItemActive(item, pathname);

        return (
          <Link
            key={item.id}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={active ? "motion-base text-text-primary underline" : "motion-base hover:text-text-primary"}
            prefetch
          >
            <span className="inline-flex items-center gap-1">
              <span>{item.label}</span>
              {item.id === "account" && accountBadgeCount > 0 ? (
                <span className="inline-flex min-w-5 items-center justify-center rounded-sm bg-state-danger px-1.5 py-0.5 text-xs font-medium text-white">
                  {accountBadgeCount}
                </span>
              ) : null}
            </span>
          </Link>
        );
        })}
      </div>
      {showThemeToggle ? <ThemeToggle /> : null}
    </nav>
  );
}
