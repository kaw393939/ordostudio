"use client";

import { useRef, useState } from "react";
import { Send, Square } from "lucide-react";

interface MaestroInputProps {
  onSend: (message: string) => void;
  onStop?: () => void;
  disabled?: boolean;
  streaming?: boolean;
  placeholder?: string;
}

export function MaestroInput({
  onSend,
  onStop,
  disabled = false,
  streaming = false,
  placeholder = "Ask the ops agent…",
}: MaestroInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = () => {
    const msg = value.trim();
    if (!msg || disabled || streaming) return;
    onSend(msg);
    setValue("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    // Auto-grow
    const el = e.target;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  };

  return (
    <div className="flex items-end gap-2 border-t bg-background p-3">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled && !streaming}
        rows={1}
        className="flex-1 resize-none rounded-md border bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 min-h-[38px] max-h-[200px] overflow-y-auto"
      />
      {streaming ? (
        <button
          onClick={onStop}
          type="button"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
          title="Stop"
        >
          <Square className="h-4 w-4" />
        </button>
      ) : (
        <button
          onClick={handleSubmit}
          type="button"
          disabled={!value.trim() || disabled}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-40"
          title="Send (Enter)"
        >
          <Send className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
