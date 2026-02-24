"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { requestHal } from "@/lib/hal-client";

type UserData = {
  id: string;
  email: string;
  display_name?: string | null;
  profile_picture_url?: string | null;
  roles?: string[];
};

function getInitials(name?: string | null, email?: string): string {
  if (name) {
    return name
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("");
  }
  return (email?.[0] ?? "U").toUpperCase();
}

export function UserMenu() {
  const [user, setUser] = useState<UserData | null>(null);

  useEffect(() => {
    requestHal<UserData>("/api/v1/me").then((res) => {
      if (res.ok) setUser(res.data);
    });
  }, []);

  if (!user) return null;

  const initials = getInitials(user.display_name, user.email);
  const displayLabel = user.display_name || user.email;
  const isAdmin =
    user.roles?.includes("ADMIN") ||
    user.roles?.includes("SUPER_ADMIN") ||
    user.roles?.includes("MAESTRO");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="motion-base flex items-center gap-2 rounded-full outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-action-primary"
          aria-label="User menu"
        >
          <Avatar size="default">
            {user.profile_picture_url ? (
              <AvatarImage src={user.profile_picture_url} alt={displayLabel} />
            ) : null}
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col gap-0.5">
            {user.display_name ? (
              <p className="type-label text-text-primary truncate">{user.display_name}</p>
            ) : null}
            <p className="type-meta text-text-muted truncate">{user.email}</p>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="/dashboard" className="cursor-pointer">Dashboard</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/account" className="cursor-pointer">Profile</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/settings/billing" className="cursor-pointer">Billing</Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        {isAdmin ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <Link href="/admin" className="cursor-pointer">Admin Console</Link>
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </>
        ) : null}

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link href="/logout" className="cursor-pointer">Log out</Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
