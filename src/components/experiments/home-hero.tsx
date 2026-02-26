import { Suspense } from "react";
import IntakeChatWidget from "@/components/chat/intake-chat-widget";

export function HomeHero() {
  return (
    <section className="flex-1 flex flex-col min-h-0 border-b border-border overflow-hidden">
      <Suspense>
        <IntakeChatWidget mode="hero" />
      </Suspense>
    </section>
  );
}
