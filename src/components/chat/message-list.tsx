"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import type { Message } from "./use-chat";
import { SOMarkIcon } from "./so-mark";

// ---------------------------------------------------------------------------
// Markdown renderer (server-safe: no hooks)
// ---------------------------------------------------------------------------

/** Module-scope: regex is compiled once, not on every message render */
const BOLD_RE = /\*\*([^*]+)\*\*/g;

function renderSpan(text: string, key: string | number): React.ReactNode {
  BOLD_RE.lastIndex = 0;
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
  if (parts.length === 1 && typeof parts[0] === "string")
    return <span key={key}>{parts[0]}</span>;
  return <span key={key}>{parts}</span>;
}

function renderContent(content: string): React.ReactNode {
  const paragraphs = content.split(/\n{2,}/);

  const renderParagraph = (para: string, pIdx: number): React.ReactNode => {
    const LINK_RE = /\[([^\]]+)\]\(([^)]+)\)/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = LINK_RE.exec(para)) !== null) {
      if (match.index > lastIndex) {
        parts.push(
          renderSpan(para.slice(lastIndex, match.index), `s${pIdx}-${lastIndex}`),
        );
      }
      const [, text, href] = match;
      const isExternal = href.startsWith("http");
      parts.push(
        isExternal ? (
          <a
            key={`a${pIdx}-${match.index}`}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 opacity-80 hover:opacity-100"
          >
            {text}
          </a>
        ) : (
          <Link
            key={`l${pIdx}-${match.index}`}
            href={href}
            className="underline underline-offset-2 opacity-80 hover:opacity-100"
          >
            {text}
          </Link>
        ),
      );
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < para.length)
      parts.push(renderSpan(para.slice(lastIndex), `e${pIdx}`));
    return (
      <p key={pIdx} className={pIdx > 0 ? "mt-2" : ""}>
        {parts}
      </p>
    );
  };

  if (paragraphs.length === 1) return renderParagraph(paragraphs[0], 0);
  return <>{paragraphs.map((p, i) => renderParagraph(p, i))}</>;
}

// ---------------------------------------------------------------------------
// Brand watermark — faded behind messages
// ---------------------------------------------------------------------------

function BrandWatermark() {
  return (
    <div
      className="absolute inset-0 pointer-events-none select-none overflow-hidden flex flex-col items-center justify-center gap-4"
      aria-hidden="true"
    >
      <svg
        width="120"
        height="120"
        viewBox="0 0 120 120"
        fill="none"
        className="opacity-[0.045]"
        aria-hidden="true"
      >
        <circle cx="60" cy="60" r="56" stroke="currentColor" strokeWidth="1.5" />
        <circle
          cx="60"
          cy="60"
          r="44"
          stroke="currentColor"
          strokeWidth="0.75"
          strokeDasharray="4 6"
        />
        <path
          d="M50 42c0-4.418 3.582-8 8-8h6c4.418 0 8 3.582 8 8v3c0 4.418-3.582 8-8 8h-4c-4.418 0-8 3.582-8 8v3c0 4.418 3.582 8 8 8h6c4.418 0 8-3.582 8-8"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <circle cx="60" cy="82" r="9" stroke="currentColor" strokeWidth="3" />
        <line x1="60" y1="4" x2="60" y2="14" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
        <line x1="60" y1="106" x2="60" y2="116" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
        <line x1="4" y1="60" x2="14" y2="60" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
        <line x1="106" y1="60" x2="116" y2="60" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      </svg>
      <p
        className="opacity-[0.04] type-label tracking-[0.35em] uppercase text-text-primary text-lg font-light"
        style={{ letterSpacing: "0.3em" }}
      >
        Studio Ordo
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Message bubble sub-components
// ---------------------------------------------------------------------------

function UserBubble({ message }: { message: Message }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[80%] flex flex-col gap-1.5 items-end">
        {message.attachments && message.attachments.length > 0 && (
          <div className="flex flex-wrap gap-1.5 justify-end">
            {message.attachments.map((a) =>
              a.preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={a.id}
                  src={a.preview}
                  alt={a.name}
                  className="max-h-52 max-w-60 rounded-2xl rounded-br-sm object-cover border border-border/40 shadow-sm"
                />
              ) : (
                <div
                  key={a.id}
                  className="flex items-center gap-1.5 border border-border/60 rounded-full px-3 py-1.5 bg-surface text-text-secondary"
                >
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 14 14"
                    fill="none"
                    className="shrink-0"
                    aria-hidden="true"
                  >
                    <path
                      d="M3 3a1 1 0 011-1h4l3 3v6a1 1 0 01-1 1H4a1 1 0 01-1-1V3z"
                      stroke="currentColor"
                      strokeWidth="1.2"
                      fill="none"
                    />
                  </svg>
                  <span className="type-meta truncate max-w-40">{a.name}</span>
                </div>
              ),
            )}
          </div>
        )}
        {message.content && (
          <div className="bg-text-primary text-text-inverse rounded-2xl rounded-br-sm px-4 py-2.5 type-body-sm leading-relaxed shadow-sm">
            {message.content}
          </div>
        )}
      </div>
    </div>
  );
}

function AssistantBubble({
  message,
  isStreaming,
}: {
  message: Message;
  isStreaming: boolean;
}) {
  return (
    <div className="flex justify-start gap-2.5 items-end">
      <div className="shrink-0 w-6 h-6 rounded-full border border-border bg-surface flex items-center justify-center mb-0.5">
        <SOMarkIcon size={10} className="text-text-muted" />
      </div>
      <div className="text-text-primary rounded-2xl rounded-bl-sm px-4 py-2.5 type-body-sm max-w-[72%] leading-relaxed border border-border/70 bg-surface shadow-sm">
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
    <div className="flex justify-start gap-2.5 items-end">
      <div className="shrink-0 w-6 h-6 rounded-full border border-border bg-surface flex items-center justify-center mb-0.5">
        <SOMarkIcon size={10} className="text-text-muted" />
      </div>
      <div className="border border-border/70 bg-surface rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1.5 items-center shadow-sm">
        <span className="w-1.5 h-1.5 rounded-full bg-text-muted animate-bounce [animation-delay:0ms]" />
        <span className="w-1.5 h-1.5 rounded-full bg-text-muted animate-bounce [animation-delay:120ms]" />
        <span className="w-1.5 h-1.5 rounded-full bg-text-muted animate-bounce [animation-delay:240ms]" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// MessageList
// ---------------------------------------------------------------------------

export interface MessageListProps {
  messages: Message[];
  isStreaming: boolean;
  isLastMsgStreaming: boolean;
  submitted: boolean;
  isDragging: boolean;
  onDragOver: React.DragEventHandler;
  onDragLeave: React.DragEventHandler;
  onDrop: React.DragEventHandler;
  containerRef?: React.RefObject<HTMLDivElement | null>;
}

export function MessageList({
  messages,
  isStreaming,
  isLastMsgStreaming,
  submitted,
  isDragging,
  onDragOver,
  onDragLeave,
  onDrop,
  containerRef,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div
      ref={containerRef}
      className="relative flex-1 overflow-y-auto px-4 py-5 flex flex-col gap-3.5 scroll-smooth min-h-0"
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <BrandWatermark />

      {isDragging && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-surface/92 border-2 border-dashed border-border rounded-xl pointer-events-none">
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            className="text-text-muted"
            aria-hidden="true"
          >
            <path
              d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <p className="type-label text-text-secondary">Drop images or files here</p>
        </div>
      )}

      {messages.map((m, i) => {
        if (m.role === "user") return <UserBubble key={m.id} message={m} />;
        const isStreamingThis =
          m.role === "assistant" && i === messages.length - 1 && isStreaming;
        return (
          <AssistantBubble key={m.id} message={m} isStreaming={isStreamingThis} />
        );
      })}

      {isLastMsgStreaming && <TypingIndicator />}

      {submitted && (
        <div className="flex justify-start gap-2.5 items-end">
          <div className="shrink-0 w-6 h-6" />
          <div className="border border-border/70 bg-surface text-text-secondary rounded-2xl rounded-bl-sm px-4 py-2.5 type-body-sm max-w-[72%] shadow-sm">
            ✓ Got it — expect a reply within one business day.
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
