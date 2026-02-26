"use client";

/**
 * useChat — encapsulates all chat session state and messaging logic.
 *
 * Owns:
 *  - messages[] (including opening message initializer)
 *  - streaming state + streamingIdRef
 *  - submitted state (intake form sent)
 *  - localStorage session / conversation ID management
 *  - sendMessage(text, attachments) — fetch + parseSSEStream
 *  - inputRef — focus restored after send
 *
 * Does NOT own:
 *  - File attachment state (→ useFileAttachments)
 *  - input value (UI-local, kept in widget)
 *  - open/close state for floating mode (UI-local)
 */

import { useMemo, useRef, useState } from "react";
import type { FileAttachment } from "./use-file-attachments";
import { parseSSEStream } from "@/lib/parse-sse-stream";
import { AGENT_OPENING_MESSAGE } from "@/lib/api/agent-system-prompt";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  attachments?: FileAttachment[];
}

export interface UseChatReturn {
  messages: Message[];
  isStreaming: boolean;
  /** True once the intake form has been submitted — disables further input. */
  submitted: boolean;
  /** Memoized: true when at least one user message exists. */
  hasUserMessages: boolean;
  /** Whether the last message is currently streaming in. */
  isLastMsgStreaming: boolean;
  /** Ref wired to the text input — hook calls focus() after send. */
  inputRef: React.RefObject<HTMLInputElement | null>;
  /**
   * Send a message with optional file attachments.
   * The caller (widget) is responsible for clearing input + attachment state
   * and revoking preview URLs before calling this.
   */
  sendMessage: (text: string, attachments: FileAttachment[]) => Promise<void>;
}

// ---------------------------------------------------------------------------
// Session storage helpers
// ---------------------------------------------------------------------------

function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return "";
  const key = "so_session_id";
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const id = crypto.randomUUID();
  localStorage.setItem(key, id);
  return id;
}

function getSavedConversationId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("so_conversation_id");
}

function saveConversationId(id: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("so_conversation_id", id);
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useChat(): UseChatReturn {
  const [messages, setMessages] = useState<Message[]>(() => [
    { id: crypto.randomUUID(), role: "assistant", content: AGENT_OPENING_MESSAGE },
  ]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  /** Stable ref to the in-flight streaming message id; null when idle. */
  const streamingIdRef = useRef<string | null>(null);

  /** Ref wired to the visible text input for post-send focus restore. */
  const inputRef = useRef<HTMLInputElement | null>(null);

  const hasUserMessages = useMemo(
    () => messages.some((m) => m.role === "user"),
    [messages],
  );

  const isLastMsgStreaming = isStreaming && streamingIdRef.current !== null;

  const sendMessage = async (
    text: string,
    attachments: FileAttachment[],
  ): Promise<void> => {
    if (!text && attachments.length === 0) return;
    if (isStreaming) return;

    // Optimistic UI: show user message immediately
    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
      attachments: attachments.length > 0 ? attachments : undefined,
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsStreaming(true);

    const sessionId = getOrCreateSessionId();
    const conversationId = getSavedConversationId();

    try {
      const res = await fetch("/api/v1/agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          message: text,
          conversation_id: conversationId,
          attachments: attachments.map((a) => ({
            type: a.type,
            mediaType: a.mediaType,
            name: a.name,
            data: a.data,
          })),
        }),
      });

      if (!res.ok || !res.body) {
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: "Something went wrong. Please try again.",
          },
        ]);
        setIsStreaming(false);
        return;
      }

      const reader = res.body.getReader();
      streamingIdRef.current = crypto.randomUUID();
      const streamingId = streamingIdRef.current;

      setMessages((prev) => [
        ...prev,
        { id: streamingId, role: "assistant", content: "" },
      ]);

      let assistantBuffer = "";

      await parseSSEStream(reader, {
        onDelta(delta) {
          assistantBuffer += delta;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === streamingId ? { ...m, content: assistantBuffer } : m,
            ),
          );
        },
        onDone({ conversationId: cid, intakeSubmitted }) {
          if (cid) saveConversationId(cid);
          if (intakeSubmitted) setSubmitted(true);
        },
        onToolCall(call) {
          console.debug("[Chat] tool call:", call.name);
        },
        onToolResult(result) {
          console.debug("[Chat] tool result:", result.name);
        },
        onError(err) {
          console.error("[Chat] SSE error:", err);
        },
      });
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "Connection lost. Please try again.",
        },
      ]);
    } finally {
      setIsStreaming(false);
      streamingIdRef.current = null;
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  return {
    messages,
    isStreaming,
    submitted,
    hasUserMessages,
    isLastMsgStreaming,
    inputRef,
    sendMessage,
  };
}
