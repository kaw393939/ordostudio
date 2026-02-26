"use client";

import { usePathname } from "next/navigation";
import { Suspense } from "react";
import IntakeChatWidget from "@/components/chat/intake-chat-widget";

/**
 * Renders the floating chat widget on all pages EXCEPT the homepage,
 * which has the chat embedded directly in the hero.
 */
export function FloatingChatGate() {
  const pathname = usePathname();
  if (pathname === "/") return null;
  return (
    <Suspense>
      <IntakeChatWidget mode="floating" />
    </Suspense>
  );
}
