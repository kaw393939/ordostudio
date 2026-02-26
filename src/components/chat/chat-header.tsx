"use client";

import { SOMarkIcon } from "./so-mark";

/**
 * ChatHeader — shared header bar for all three chat modes.
 */
export function ChatHeader({
  mode,
  onClose,
}: {
  mode: "hero" | "page" | "floating";
  onClose?: () => void;
}) {
  if (mode === "hero") {
    return (
      <div className="flex items-center justify-between px-5 py-3 border-b border-border/60 shrink-0 bg-surface">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <SOMarkIcon size={18} className="text-text-primary shrink-0" />
            <span className="type-label text-text-primary tracking-wide">Studio Ordo</span>
          </div>
          <span className="hidden sm:block type-meta text-text-muted">
            We train engineers to govern the machine.
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shrink-0" />
          <span className="type-meta text-text-muted">AI agent</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex items-center justify-between border-b border-border/60 shrink-0 bg-surface ${
        mode === "floating" ? "px-4 py-3.5" : "px-5 py-3.5"
      }`}
    >
      <div className="flex items-center gap-2.5">
        <SOMarkIcon
          size={mode === "page" ? 20 : 18}
          className="text-text-primary shrink-0"
        />
        <div>
          <p className="type-label text-text-primary leading-none">Studio Ordo</p>
          <p className="type-meta text-text-muted mt-0.5">AI agent · replies instantly</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
        {mode === "page" && (
          <span className="type-meta text-text-muted">Online</span>
        )}
        {mode === "floating" && onClose && (
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-surface-muted text-text-muted hover:text-text-primary transition-colors"
            aria-label="Close chat"
          >
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
