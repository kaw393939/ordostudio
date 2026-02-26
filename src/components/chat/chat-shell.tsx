"use client";

import { SOMarkIcon } from "./so-mark";

/**
 * ChatShell — layout wrapper for all three chat surface modes.
 *
 * Handles the outer container chrome:
 *   hero     — full-height flex column, no shadow
 *   page     — bordered card, fixed min/max height
 *   floating — fixed-position panel + launcher button
 *
 * Children are the panel contents (header + message list + input row).
 */

interface ChatShellProps {
  mode: "hero" | "page" | "floating";
  /** For floating mode — whether the panel is currently visible. */
  isOpen?: boolean;
  onClose?: () => void;
  onOpen?: () => void;
  children: React.ReactNode;
}

export function ChatShell({
  mode,
  isOpen,
  onOpen,
  children,
}: ChatShellProps) {
  if (mode === "hero") {
    return (
      <div
        className="flex flex-col h-full min-h-0 bg-surface"
        aria-label="Studio Ordo chat"
        role="region"
      >
        {children}
      </div>
    );
  }

  if (mode === "page") {
    return (
      <div
        className="flex flex-col border border-border rounded-2xl bg-surface overflow-hidden shadow-sm"
        style={{ minHeight: "440px", maxHeight: "620px" }}
        aria-label="Studio Ordo chat"
        role="region"
      >
        {children}
      </div>
    );
  }

  // mode === "floating"
  return (
    <>
      {isOpen && (
        <div
          className="fixed bottom-20 right-4 w-[22rem] md:w-96 border border-border/70 rounded-2xl bg-surface flex flex-col shadow-2xl z-50 overflow-hidden"
          style={{ height: "560px" }}
          aria-label="Studio Ordo chat"
          role="region"
        >
          {children}
        </div>
      )}

      {!isOpen && (
        <button
          type="button"
          onClick={onOpen}
          className="fixed bottom-6 right-6 bg-text-primary text-text-inverse h-12 pl-4 pr-5 rounded-full shadow-xl type-label hover:opacity-90 active:scale-95 transition-all z-50 flex items-center gap-2.5"
          aria-label="Open Studio Ordo chat"
        >
          <SOMarkIcon size={16} className="shrink-0" />
          <span>Talk to us</span>
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse shrink-0" />
        </button>
      )}
    </>
  );
}
