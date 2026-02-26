"use client";

import { useEffect, useRef } from "react";
import { Bot, User } from "lucide-react";
import { useMaestroChat } from "@/lib/hooks/use-maestro-chat";
import { MaestroInput } from "./maestro-input";

interface MaestroChatProps {
  userId?: string;
}

export function MaestroChat({ userId }: MaestroChatProps) {
  const { messages, streaming, error, send, clear, stop } = useMaestroChat({
    userId,
  });

  const bottomRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom whenever messages update
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-2">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Ops Agent</span>
          {streaming && (
            <span className="text-xs text-muted-foreground animate-pulse">
              thinking…
            </span>
          )}
        </div>
        {messages.length > 0 && (
          <button
            onClick={clear}
            className="text-xs text-muted-foreground hover:text-foreground underline"
          >
            Clear
          </button>
        )}
      </div>

      {/* Message list */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center text-sm text-muted-foreground gap-2">
            <Bot className="h-8 w-8 opacity-30" />
            <p className="max-w-xs">
              Ask the ops agent to show the intake queue, review role requests,
              pull revenue figures, or check the audit log.
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <MessageBubble key={i} role={msg.role} text={msg.text} pending={msg.pending} />
        ))}

        {error && (
          <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <MaestroInput
        onSend={(msg) => void send(msg)}
        onStop={stop}
        streaming={streaming}
        disabled={false}
      />
    </div>
  );
}

function MessageBubble({
  role,
  text,
  pending,
}: {
  role: "user" | "assistant";
  text: string;
  pending?: boolean;
}) {
  const isUser = role === "user";

  return (
    <div
      className={`flex gap-2.5 ${isUser ? "flex-row-reverse" : "flex-row"}`}
    >
      <div
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground"
        }`}
      >
        {isUser ? (
          <User className="h-3.5 w-3.5" />
        ) : (
          <Bot className="h-3.5 w-3.5" />
        )}
      </div>

      <div
        className={`max-w-[80%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
          isUser
            ? "bg-primary text-primary-foreground rounded-tr-none"
            : "bg-muted text-foreground rounded-tl-none"
        } ${pending && !text ? "opacity-60" : ""}`}
      >
        {text || (pending ? <StreamingDots /> : "")}
      </div>
    </div>
  );
}

function StreamingDots() {
  return (
    <span className="inline-flex gap-0.5 items-center h-4">
      <span className="h-1.5 w-1.5 rounded-full bg-current animate-bounce [animation-delay:0ms]" />
      <span className="h-1.5 w-1.5 rounded-full bg-current animate-bounce [animation-delay:150ms]" />
      <span className="h-1.5 w-1.5 rounded-full bg-current animate-bounce [animation-delay:300ms]" />
    </span>
  );
}
