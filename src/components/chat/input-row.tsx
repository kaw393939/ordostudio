"use client";

import type { FileAttachment } from "./use-file-attachments";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const SUGGESTIONS = [
  "What do you offer?",
  "I need a project built",
  "Training for my team",
  "What's the Maestro program?",
];

const ACCEPT_TYPES =
  "image/jpeg,image/png,image/gif,image/webp,application/pdf,text/plain";

// ---------------------------------------------------------------------------
// AttachmentPreviewTray
// ---------------------------------------------------------------------------

function AttachmentPreviewTray({
  attachments,
  onRemove,
}: {
  attachments: FileAttachment[];
  onRemove: (id: string) => void;
}) {
  if (attachments.length === 0) return null;
  return (
    <div className="px-4 pb-2 flex flex-wrap gap-2">
      {attachments.map((a) => (
        <div
          key={a.id}
          className="relative group flex items-center gap-1.5 border border-border/60 rounded-xl overflow-hidden bg-surface shadow-sm"
        >
          {a.preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={a.preview} alt={a.name} className="h-12 w-12 object-cover" />
          ) : (
            <div className="h-12 w-12 flex items-center justify-center bg-surface-muted">
              <svg
                width="16"
                height="16"
                viewBox="0 0 20 20"
                fill="none"
                className="text-text-muted"
                aria-hidden="true"
              >
                <path
                  d="M4 4a2 2 0 012-2h5l5 5v9a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  fill="none"
                />
                <path
                  d="M11 2v5h5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          )}
          <span className="pr-7 pl-1 type-meta text-text-muted truncate max-w-28">
            {a.name}
          </span>
          <button
            type="button"
            onClick={() => onRemove(a.id)}
            className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-text-primary text-text-inverse flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label={`Remove ${a.name}`}
          >
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none" aria-hidden="true">
              <path
                d="M1 1l6 6M7 1L1 7"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// InputRow
// ---------------------------------------------------------------------------

export interface InputRowProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  pendingAttachments: FileAttachment[];
  onRemoveAttachment: (id: string) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFileInputChange: React.ChangeEventHandler<HTMLInputElement>;
  onPaste: React.ClipboardEventHandler;
  isStreaming: boolean;
  submitted: boolean;
  hasUserMessages: boolean;
  onSuggestion: (text: string) => void;
}

export function InputRow({
  value,
  onChange,
  onSend,
  inputRef,
  pendingAttachments,
  onRemoveAttachment,
  fileInputRef,
  onFileInputChange,
  onPaste,
  isStreaming,
  submitted,
  hasUserMessages,
  onSuggestion,
}: InputRowProps) {
  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  }

  return (
    <>
      {/* Suggestion chips — shown before first user message */}
      {!hasUserMessages && !submitted && (
        <div className="px-4 pb-3 flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onSuggestion(s)}
              disabled={isStreaming}
              className="rounded-full border border-border/70 px-3.5 py-1.5 type-meta text-text-secondary hover:border-text-primary hover:text-text-primary hover:bg-surface-muted transition-all disabled:opacity-40"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Attachment preview tray */}
      <AttachmentPreviewTray
        attachments={pendingAttachments}
        onRemove={onRemoveAttachment}
      />

      {/* Input bar */}
      <div className="px-3 py-3 border-t border-border/60 flex gap-2 items-center bg-surface">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPT_TYPES}
          multiple
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={onFileInputChange}
        />

        {/* Attach button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={submitted}
          className="shrink-0 w-8 h-8 rounded-full border border-border/60 flex items-center justify-center text-text-muted hover:text-text-primary hover:border-text-primary disabled:opacity-30 transition-colors"
          aria-label="Attach file or image"
          title="Attach image or PDF (or paste / drop)"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 15 15"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M13.5 7.5l-5.5 5.5a4 4 0 01-5.657-5.657L8 1.686a2.5 2.5 0 013.536 3.535L6 10.757a1 1 0 01-1.414-1.414l5.5-5.5"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        {/* Text input */}
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={onPaste}
          disabled={isStreaming || submitted}
          placeholder={
            submitted
              ? "Intake submitted."
              : pendingAttachments.length > 0
              ? "Add a message or send as-is…"
              : "Ask anything  ·  or drop a file"
          }
          className="flex-1 bg-surface-muted border border-border/50 rounded-full px-4 py-2 type-body-sm text-text-primary placeholder:text-text-muted disabled:opacity-40 focus:outline-none focus:ring-1 focus:ring-text-secondary/50 transition-all"
          aria-label="Message input"
        />

        {/* Send button */}
        <button
          type="button"
          onClick={onSend}
          disabled={
            isStreaming ||
            (value.trim() === "" && pendingAttachments.length === 0) ||
            submitted
          }
          aria-label="Send message"
          className="shrink-0 w-8 h-8 rounded-full bg-text-primary text-text-inverse flex items-center justify-center hover:opacity-80 disabled:opacity-25 transition-opacity"
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 14 14"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M7 12V2M2 7l5-5 5 5"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </>
  );
}
