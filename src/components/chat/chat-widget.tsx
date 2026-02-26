"use client";

/**
 * ChatWidget — Universal Studio Ordo chat surface (compositor)
 *
 * mode: 'hero'     — fills parent container, no chrome (homepage full-bleed)
 *       'page'     — inline card with border (apply, join, etc.)
 *       'floating' — bottom-right overlay panel + launcher button
 *
 * Pure compositor: all state logic lives in useChat and useFileAttachments;
 * all rendering is delegated to sub-components.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useChat } from "./use-chat";
import { useFileAttachments } from "./use-file-attachments";
import { ChatShell } from "./chat-shell";
import { ChatHeader } from "./chat-header";
import { MessageList } from "./message-list";
import { InputRow } from "./input-row";

// ---------------------------------------------------------------------------
// ChatWidget
// ---------------------------------------------------------------------------

interface ChatWidgetProps {
  mode: "floating" | "page" | "hero";
}

export default function ChatWidget({ mode }: ChatWidgetProps) {
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(
    mode !== "floating" ||
      (typeof window !== "undefined" &&
        new URLSearchParams(window.location.search).get("chat") === "open"),
  );
  const [input, setInput] = useState("");

  useEffect(() => {
    if (mode === "floating" && searchParams.get("chat") === "open") setIsOpen(true);
  }, [mode, searchParams]);

  // Shared ref for the messages scroll area — used for drag-leave detection
  const messagesRef = useRef<HTMLDivElement | null>(null);

  const {
    messages,
    isStreaming,
    submitted,
    hasUserMessages,
    isLastMsgStreaming,
    inputRef,
    sendMessage,
  } = useChat();

  const {
    pendingAttachments,
    isDragging,
    fileInputRef,
    removeAttachment,
    clearAttachments,
    revokeAttachments,
    handlers: fileHandlers,
  } = useFileAttachments({ containerRef: messagesRef });

  // Restore focus to input after panel opens
  useEffect(() => {
    if (isOpen && !submitted) {
      const t = setTimeout(() => inputRef.current?.focus(), 80);
      return () => clearTimeout(t);
    }
  }, [isOpen, submitted, inputRef]);

  // Build and dispatch a message (text + current attachments)
  const handleSend = useCallback(
    async (overrideText?: string) => {
      const text = (overrideText ?? input).trim();
      if (!text && pendingAttachments.length === 0) return;
      const attachments = [...pendingAttachments];
      setInput("");
      revokeAttachments(attachments);
      clearAttachments();
      await sendMessage(text, attachments);
    },
    [input, pendingAttachments, revokeAttachments, clearAttachments, sendMessage],
  );

  return (
    <ChatShell mode={mode} isOpen={isOpen} onOpen={() => setIsOpen(true)}>
      <ChatHeader mode={mode} onClose={() => setIsOpen(false)} />
      <MessageList
        messages={messages}
        isStreaming={isStreaming}
        isLastMsgStreaming={isLastMsgStreaming}
        submitted={submitted}
        isDragging={isDragging}
        onDragOver={fileHandlers.onDragOver}
        onDragLeave={fileHandlers.onDragLeave}
        onDrop={fileHandlers.onDrop}
        containerRef={messagesRef}
      />
      <InputRow
        value={input}
        onChange={setInput}
        onSend={() => void handleSend()}
        inputRef={inputRef}
        pendingAttachments={pendingAttachments}
        onRemoveAttachment={removeAttachment}
        fileInputRef={fileInputRef}
        onFileInputChange={fileHandlers.onFileInputChange}
        onPaste={fileHandlers.onPaste}
        isStreaming={isStreaming}
        submitted={submitted}
        hasUserMessages={hasUserMessages}
        onSuggestion={(text) => void handleSend(text)}
      />
    </ChatShell>
  );
}
