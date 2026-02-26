import { Suspense } from "react";
import ChatWidget from "@/components/chat/chat-widget";

export function HomeHero() {
  return (
    <section className="flex-1 flex flex-col min-h-0 border-b border-border overflow-hidden">
      <Suspense>
        <ChatWidget mode="hero" />
      </Suspense>
    </section>
  );
}
