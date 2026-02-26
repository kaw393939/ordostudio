"use client";

/**
 * IntakeChatWidget — Elite multimodal intake chat
 *
 * mode: 'hero'     — fills parent container, no border (homepage)
 *       'page'     — inline card with border
 *       'floating' — bottom-right overlay panel + launcher button
 *
 * Supports:
 *  - Streaming assistant responses (SSE)
 *  - Image attachments (JPEG, PNG, GIF, WebP) — file picker, drag-drop, clipboard paste
 *  - Document attachments (PDF) — file picker only
 *  - Markdown link rendering in assistant messages
 *  - Suggestion chips before first user turn
 *  - Auto-focus input on open
 */

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Attachment {
  id: string;
  type: "image" | "document";
  mediaType: string;
  name: string;
  data: string;      // base64 (no data-url prefix)
  preview?: string;  // object URL for images
}

interface Message {
  role: "user" | "assistant";
  content: string;
  attachments?: Attachment[];
}

interface SSEDelta {
  delta?: string;
  tool_call?: { name: string; args: unknown };
  tool_result?: { name: string; result: unknown };
  done?: boolean;
  conversation_id?: string;
  intake_submitted?: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const OPENING_MESSAGE =
  "We're a small training and consulting studio. I'm here to figure out if we're the right fit. What brings you here today?";

const SUGGESTIONS = [
  "What do you offer?",
  "I need a project built",
  "Training for my team",
  "What's the Maestro program?",
];

const ACCEPT_TYPES = "image/jpeg,image/png,image/gif,image/webp,application/pdf,text/plain";

// ---------------------------------------------------------------------------
// Session helpers (localStorage)
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

function getConversationId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("so_conversation_id");
}

function setConversationId(id: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("so_conversation_id", id);
}

// ---------------------------------------------------------------------------
// File helpers
// ---------------------------------------------------------------------------

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function filesToAttachments(files: File[]): Promise<Attachment[]> {
  const results: Attachment[] = [];
  for (const file of files) {
    const isImage = file.type.startsWith("image/");
    const isPdf = file.type === "application/pdf";
    if (!isImage && !isPdf) continue;

    const data = await fileToBase64(file);
    const attachment: Attachment = {
      id: crypto.randomUUID(),
      type: isImage ? "image" : "document",
      mediaType: file.type,
      name: file.name,
      data,
      preview: isImage ? URL.createObjectURL(file) : undefined,
    };
    results.push(attachment);
  }
  return results;
}

// ---------------------------------------------------------------------------
// Markdown link renderer
// ---------------------------------------------------------------------------

/**
 * Render assistant message content:
 * - **bold** → <strong>
 * - [text](href) → <Link> or <a>
 * - double newlines → paragraph breaks
 */
function renderSpan(text: string, key: string | number): React.ReactNode {
  // Bold: **text**
  const BOLD_RE = /\*\*([^*]+)\*\*/g;
  const parts: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = BOLD_RE.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    parts.push(<strong key={m.index}>{m[1]}</strong>);
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  if (parts.length === 0) return null;
  if (parts.length === 1 && typeof parts[0] === "string") return <span key={key}>{parts[0]}</span>;
  return <span key={key}>{parts}</span>;
}

function renderContent(content: string): React.ReactNode {
  // Split on double newlines into paragraphs first
  const paragraphs = content.split(/\n{2,}/);

  const renderParagraph = (para: string, pIdx: number): React.ReactNode => {
    // Handle markdown links inside each paragraph segment
    const LINK_RE = /\[([^\]]+)\]\(([^)]+)\)/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = LINK_RE.exec(para)) !== null) {
      if (match.index > lastIndex) {
        parts.push(renderSpan(para.slice(lastIndex, match.index), `s${pIdx}-${lastIndex}`));
      }
      const [, text, href] = match;
      const isExternal = href.startsWith("http");
      parts.push(
        isExternal ? (
          <a key={`a${pIdx}-${match.index}`} href={href} target="_blank" rel="noopener noreferrer"
            className="underline underline-offset-2 opacity-80 hover:opacity-100">{text}</a>
        ) : (
          <Link key={`l${pIdx}-${match.index}`} href={href}
            className="underline underline-offset-2 opacity-80 hover:opacity-100">{text}</Link>
        )
      );
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < para.length) parts.push(renderSpan(para.slice(lastIndex), `e${pIdx}`));
    return <p key={pIdx} className={pIdx > 0 ? "mt-2" : ""}>{parts}</p>;
  };

  if (paragraphs.length === 1) {
    return renderParagraph(paragraphs[0], 0);
  }
  return <>{paragraphs.map((p, i) => renderParagraph(p, i))}</>;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function AttachmentPreviewTray({
  attachments,
  onRemove,
}: {
  attachments: Attachment[];
  onRemove: (id: string) => void;
}) {
  if (attachments.length === 0) return null;
  return (
    <div className="px-4 pb-2 flex flex-wrap gap-2">
      {attachments.map((a) => (
        <div key={a.id} className="relative group flex items-center gap-1.5 border border-border rounded-lg overflow-hidden bg-surface">
          {a.preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={a.preview} alt={a.name} className="h-12 w-12 object-cover" />
          ) : (
            <div className="h-12 w-12 flex items-center justify-center bg-surface-muted">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-text-muted" aria-hidden="true">
                <path d="M4 4a2 2 0 012-2h5l5 5v9a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                <path d="M11 2v5h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
          )}
          <span className="pr-7 pl-1 type-meta text-text-muted truncate max-w-28">{a.name}</span>
          <button
            type="button"
            onClick={() => onRemove(a.id)}
            className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-text-primary text-text-inverse flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label={`Remove ${a.name}`}
          >
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none" aria-hidden="true">
              <path d="M1 1l6 6M7 1L1 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}

function UserBubble({ message }: { message: Message }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[80%] flex flex-col gap-1.5 items-end">
        {message.attachments && message.attachments.length > 0 && (
          <div className="flex flex-wrap gap-1.5 justify-end">
            {message.attachments.map((a) =>
              a.preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={a.id} src={a.preview} alt={a.name}
                  className="max-h-52 max-w-60 rounded-xl rounded-br-sm object-cover border border-border" />
              ) : (
                <div key={a.id} className="flex items-center gap-1.5 border border-border rounded-full px-3 py-1.5 bg-surface">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-text-muted shrink-0" aria-hidden="true">
                    <path d="M3 3a1 1 0 011-1h4l3 3v6a1 1 0 01-1 1H4a1 1 0 01-1-1V3z" stroke="currentColor" strokeWidth="1.2" fill="none"/>
                  </svg>
                  <span className="type-meta text-text-secondary truncate max-w-40">{a.name}</span>
                </div>
              )
            )}
          </div>
        )}
        {message.content && (
          <div className="bg-text-primary text-text-inverse rounded-2xl rounded-br-sm px-4 py-2.5 type-body-sm leading-relaxed">
            {message.content}
          </div>
        )}
      </div>
    </div>
  );
}

function AssistantBubble({ message, isStreaming }: { message: Message; isStreaming: boolean }) {
  return (
    <div className="flex justify-start">
      <div className="text-text-primary rounded-2xl rounded-bl-sm px-4 py-2.5 type-body-sm max-w-[72%] leading-relaxed border border-border bg-surface">
        {message.content ? renderContent(message.content) : null}
        {isStreaming && (
          <span className="inline-block w-0.5 h-3.5 bg-text-muted align-middle ml-0.5 animate-pulse" />
        )}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="border border-border bg-surface rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1.5 items-center">
        <span className="w-1.5 h-1.5 rounded-full bg-text-muted animate-bounce [animation-delay:0ms]" />
        <span className="w-1.5 h-1.5 rounded-full bg-text-muted animate-bounce [animation-delay:150ms]" />
        <span className="w-1.5 h-1.5 rounded-full bg-text-muted animate-bounce [animation-delay:300ms]" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface IntakeChatWidgetProps {
  mode: "floating" | "page" | "hero";
}

export default function IntakeChatWidget({ mode }: IntakeChatWidgetProps) {
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(
    mode !== "floating" ||
      (typeof window !== "undefined" &&
        new URLSearchParams(window.location.search).get("chat") === "open")
  );

  useEffect(() => {
    if (mode === "floating" && searchParams.get("chat") === "open") setIsOpen(true);
  }, [mode, searchParams]);

  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: OPENING_MESSAGE },
  ]);
  const [input, setInput] = useState("");
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);

  const hasUserMessages = messages.some((m) => m.role === "user");

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (isOpen && !submitted) {
      const t = setTimeout(() => inputRef.current?.focus(), 80);
      return () => clearTimeout(t);
    }
  }, [isOpen, submitted]);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      for (const a of pendingAttachments) {
        if (a.preview) URL.revokeObjectURL(a.preview);
      }
    };
  }, [pendingAttachments]);

  // ── File handling ──────────────────────────────────────────────────────────

  const processFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const newAttachments = await filesToAttachments(fileArray);
    if (newAttachments.length > 0) {
      setPendingAttachments((prev) => [...prev, ...newAttachments]);
    }
  }, []);

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) void processFiles(e.target.files);
      e.target.value = "";
    },
    [processFiles],
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const imageItems = Array.from(e.clipboardData.items).filter(
        (item) => item.kind === "file" && item.type.startsWith("image/"),
      );
      if (imageItems.length === 0) return;
      e.preventDefault();
      const files = imageItems.map((item) => item.getAsFile()).filter((f): f is File => f !== null);
      void processFiles(files);
    },
    [processFiles],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    if (!messagesRef.current?.contains(e.relatedTarget as Node)) setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files.length > 0) void processFiles(e.dataTransfer.files);
    },
    [processFiles],
  );

  const removeAttachment = useCallback((id: string) => {
    setPendingAttachments((prev) => {
      const removed = prev.find((a) => a.id === id);
      if (removed?.preview) URL.revokeObjectURL(removed.preview);
      return prev.filter((a) => a.id !== id);
    });
  }, []);

  // ── Send ──────────────────────────────────────────────────────────────────

  async function sendMessage(overrideText?: string) {
    const text = (overrideText ?? input).trim();
    if ((!text && pendingAttachments.length === 0) || isStreaming) return;

    const currentAttachments = [...pendingAttachments];
    setInput("");
    setPendingAttachments([]);

    // Optimistic UI: show sent message immediately
    const sentMessage: Message = {
      role: "user",
      content: text,
      attachments: currentAttachments.length > 0 ? currentAttachments : undefined,
    };
    setMessages((prev) => [...prev, sentMessage]);
    setIsStreaming(true);

    const sessionId = getOrCreateSessionId();
    const conversationId = getConversationId();

    try {
      const res = await fetch("/api/v1/agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          message: text,
          conversation_id: conversationId,
          attachments: currentAttachments.map((a) => ({
            type: a.type,
            mediaType: a.mediaType,
            name: a.name,
            data: a.data,
          })),
        }),
      });

      if (!res.ok || !res.body) {
        setMessages((prev) => [...prev, { role: "assistant", content: "Something went wrong. Please try again." }]);
        setIsStreaming(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantBuffer = "";
      let msgIndex = -1;

      setMessages((prev) => {
        msgIndex = prev.length;
        return [...prev, { role: "assistant", content: "" }];
      });

      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          let parsed: SSEDelta;
          try { parsed = JSON.parse(line.slice(6)) as SSEDelta; }
          catch { continue; }

          if (parsed.delta) {
            assistantBuffer += parsed.delta;
            setMessages((prev) => {
              const updated = [...prev];
              if (msgIndex >= 0 && msgIndex < updated.length) {
                updated[msgIndex] = { role: "assistant", content: assistantBuffer };
              }
              return updated;
            });
          }

          if (parsed.done) {
            if (parsed.conversation_id) setConversationId(parsed.conversation_id);
            if (parsed.intake_submitted) setSubmitted(true);
          }
        }
      }
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Connection lost. Please try again." }]);
    } finally {
      setIsStreaming(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendMessage();
    }
  }

  // ── Shared panel body ──────────────────────────────────────────────────────

  const isLastMsgStreaming = isStreaming && messages[messages.length - 1]?.content === "";

  const panelBody = (
    <>
      {/* Messages */}
      <div
        ref={messagesRef}
        className="relative flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3 scroll-smooth min-h-0"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Drag-drop target overlay */}
        {isDragging && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-surface/90 border-2 border-dashed border-text-secondary rounded-lg pointer-events-none">
            <p className="type-label text-text-secondary">Drop images or files here</p>
          </div>
        )}

        {messages.map((m, i) => {
          if (m.role === "user") return <UserBubble key={i} message={m} />;
          const isStreamingThis = m.role === "assistant" && i === messages.length - 1 && isStreaming;
          return <AssistantBubble key={i} message={m} isStreaming={isStreamingThis} />;
        })}

        {isLastMsgStreaming && <TypingIndicator />}

        {submitted && (
          <div className="flex justify-start">
            <div className="border border-border bg-surface text-text-secondary rounded-2xl px-4 py-2.5 type-body-sm max-w-[88%]">
              ✓ Got it — expect a reply within one business day.
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Suggestion chips — before first user turn */}
      {!hasUserMessages && !submitted && (
        <div className="px-4 pb-2 flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button key={s} type="button" onClick={() => void sendMessage(s)} disabled={isStreaming}
              className="rounded-full border border-border px-3 py-1 type-meta text-text-secondary hover:border-text-primary hover:text-text-primary transition-colors disabled:opacity-40">
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Attachment preview tray */}
      <AttachmentPreviewTray attachments={pendingAttachments} onRemove={removeAttachment} />

      {/* Input row */}
      <div className="px-4 py-3 border-t border-border flex gap-2 items-center">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPT_TYPES}
          multiple
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={handleFileInputChange}
        />

        {/* Attach button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={submitted}
          className="shrink-0 w-9 h-9 rounded-full border border-border flex items-center justify-center text-text-muted hover:text-text-primary hover:border-text-primary disabled:opacity-30 transition-colors"
          aria-label="Attach file or image"
          title="Attach image or PDF (or paste/drop)"
        >
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
            <path d="M13.5 7.5l-5.5 5.5a4 4 0 01-5.657-5.657L8 1.686a2.5 2.5 0 013.536 3.535L6 10.757a1 1 0 01-1.414-1.414l5.5-5.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        {/* Text input */}
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          disabled={isStreaming || submitted}
          placeholder={submitted ? "Intake submitted." : pendingAttachments.length > 0 ? "Add a message or send as-is…" : "Ask anything — or drop a file"}
          className="flex-1 bg-transparent border border-border rounded-full px-4 py-2 type-body-sm text-text-primary placeholder:text-text-muted disabled:opacity-40 focus:outline-none focus:ring-1 focus:ring-text-secondary transition-all"
          aria-label="Message input"
        />

        {/* Send button */}
        <button
          type="button"
          onClick={() => void sendMessage()}
          disabled={isStreaming || (input.trim() === "" && pendingAttachments.length === 0) || submitted}
          aria-label="Send message"
          className="shrink-0 w-9 h-9 rounded-full bg-text-primary text-text-inverse flex items-center justify-center hover:opacity-80 disabled:opacity-30 transition-opacity"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M7 12V2M2 7l5-5 5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
    </>
  );

  // ── Hero mode ──────────────────────────────────────────────────────────────
  if (mode === "hero") {
    return (
      <div className="flex flex-col h-full min-h-0" aria-label="Studio Ordo intake chat" role="region">
        <div className="flex items-center justify-between px-5 py-3 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <span className="type-label text-text-primary">Studio Ordo</span>
            <span className="hidden sm:block type-meta text-text-muted">
              We train engineers to govern the machine.
            </span>
          </div>
          <div className="flex items-center gap-1.5 type-meta text-text-muted">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
            AI agent
          </div>
        </div>
        {panelBody}
      </div>
    );
  }

  // ── Page mode ──────────────────────────────────────────────────────────────
  if (mode === "page") {
    return (
      <div className="flex flex-col border border-border rounded-lg bg-surface overflow-hidden"
        style={{ minHeight: "420px", maxHeight: "600px" }}
        aria-label="Studio Ordo intake chat" role="region">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <div>
            <p className="type-label text-text-primary">Studio Ordo</p>
            <p className="type-meta text-text-muted">AI agent · usually replies instantly</p>
          </div>
          <div className="flex items-center gap-1.5 type-meta text-text-muted">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
            Online
          </div>
        </div>
        {panelBody}
      </div>
    );
  }

  // ── Floating mode ──────────────────────────────────────────────────────────
  return (
    <>
      {isOpen && (
        <div
          className="fixed bottom-20 right-4 w-80 md:w-88 border border-border rounded-2xl bg-surface flex flex-col shadow-2xl z-50 overflow-hidden"
          style={{ height: "540px" }}
          aria-label="Studio Ordo intake chat" role="region"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
            <div>
              <p className="type-label text-text-primary">Studio Ordo</p>
              <p className="type-meta text-text-muted">AI agent · usually replies instantly</p>
            </div>
            <button type="button" onClick={() => setIsOpen(false)}
              className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-surface-muted text-text-secondary hover:text-text-primary transition-colors"
              aria-label="Close chat">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
          {panelBody}
        </div>
      )}

      {!isOpen && (
        <button type="button" onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 bg-text-primary text-text-inverse px-5 py-3 rounded-full shadow-xl type-label hover:opacity-90 transition-all z-50 flex items-center gap-2"
          aria-label="Open intake chat">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse shrink-0" />
          Talk to us
        </button>
      )}
    </>
  );
}
