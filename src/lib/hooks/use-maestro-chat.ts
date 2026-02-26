"use client";

import { useCallback, useRef, useState } from "react";

export interface ChatMessage {
  role: "user" | "assistant";
  text: string;
  pending?: boolean;
}

export interface UseMaestroChatOptions {
  /** Optional user ID — used to key localStorage persistence. */
  userId?: string;
}

export function useMaestroChat({ userId }: UseMaestroChatOptions = {}) {
  const storageKey = userId ? `maestro-chat-${userId}` : null;

  // Initialise messages from localStorage when available
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (typeof window === "undefined" || !storageKey) return [];
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) return JSON.parse(raw) as ChatMessage[];
    } catch {
      /* ignore */
    }
    return [];
  });

  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const persist = useCallback(
    (msgs: ChatMessage[]) => {
      if (!storageKey) return;
      try {
        localStorage.setItem(storageKey, JSON.stringify(msgs));
      } catch {
        /* quota exceeded — silently ignore */
      }
    },
    [storageKey],
  );

  const send = useCallback(
    async (message: string) => {
      if (!message.trim() || streaming) return;

      setError(null);

      // Build history from current messages (excluding pending placeholders)
      const history = messages
        .filter((m) => !m.pending)
        .map((m) => ({ role: m.role, text: m.text }));

      // Append the user message immediately
      const userMsg: ChatMessage = { role: "user", text: message };
      const pendingAssistant: ChatMessage = {
        role: "assistant",
        text: "",
        pending: true,
      };

      const withUser = [...messages, userMsg, pendingAssistant];
      setMessages(withUser);
      persist([...messages, userMsg]);

      setStreaming(true);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch("/api/v1/agent/maestro", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          signal: controller.signal,
          body: JSON.stringify({ message, history }),
        });

        if (!res.ok || !res.body) {
          const body = await res.json().catch(() => ({}));
          throw new Error(
            (body as { detail?: string }).detail ?? `HTTP ${res.status}`,
          );
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const payload = JSON.parse(line.slice(6)) as {
                delta?: string;
                done?: boolean;
                error?: string;
              };

              if (payload.error) {
                throw new Error(payload.error);
              }

              if (payload.delta) {
                accumulated += payload.delta;
                setMessages((prev) => {
                  const updated = prev.map((m, idx) =>
                    idx === prev.length - 1 && m.pending
                      ? { ...m, text: accumulated }
                      : m,
                  );
                  return updated;
                });
              }
            } catch (parseErr) {
              // Skip malformed SSE lines
              if (
                parseErr instanceof SyntaxError === false &&
                parseErr instanceof Error
              ) {
                throw parseErr;
              }
            }
          }
        }

        // Finalize: mark assistant message as no longer pending
        setMessages((prev) => {
          const finalised = prev.map((m, idx) =>
            idx === prev.length - 1 && m.pending
              ? { ...m, pending: false }
              : m,
          );
          persist(finalised);
          return finalised;
        });
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        const msg = err instanceof Error ? err.message : "Unknown error";
        setError(msg);
        // Remove the pending placeholder on error
        setMessages((prev) => {
          const cleaned = prev.filter((m) => !m.pending);
          persist(cleaned);
          return cleaned;
        });
      } finally {
        setStreaming(false);
        abortRef.current = null;
      }
    },
    [messages, streaming, persist],
  );

  const clear = useCallback(() => {
    setMessages([]);
    setError(null);
    if (storageKey) {
      try {
        localStorage.removeItem(storageKey);
      } catch {
        /* ignore */
      }
    }
  }, [storageKey]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return { messages, streaming, error, send, clear, stop };
}
