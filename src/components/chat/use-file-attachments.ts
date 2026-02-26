/**
 * useFileAttachments — encapsulates all file attachment lifecycle for ChatWidget.
 *
 * Responsibilities:
 *  - File selection via <input>, drag-drop, clipboard paste
 *  - Parallel base64 encoding + preview URL creation (Promise.all)
 *  - MIME type guard and deduplication
 *  - Object URL revocation (on remove, on clear, on unmount)
 *
 * The ChatWidget component spreads the returned `handlers` onto the appropriate
 * DOM elements and uses `pendingAttachments` for display.
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// ---------------------------------------------------------------------------
// Types (re-exported so consumers don't need to redeclare)
// ---------------------------------------------------------------------------

export interface FileAttachment {
  id: string;
  type: "image" | "document";
  mediaType: string;
  name: string;
  data: string;      // base64, no data-url prefix
  preview?: string;  // object URL — images only
  size: number;
}

// ---------------------------------------------------------------------------
// File processing helpers
// ---------------------------------------------------------------------------

function fileToBase64(file: File): Promise<string> {
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

async function processFileList(
  files: File[],
  accept: string[],
  existing: FileAttachment[],
): Promise<FileAttachment[]> {
  // Filter to accepted MIME types
  const accepted = files.filter((f) => accept.some((a) => {
    if (a.endsWith("/*")) return f.type.startsWith(a.slice(0, -1));
    return f.type === a;
  }));

  // Deduplicate against existing by name+size
  const existingKeys = new Set(existing.map((a) => `${a.name}::${a.size}`));
  const novel = accepted.filter((f) => !existingKeys.has(`${f.name}::${f.size}`));

  // Parallel encoding — fixes the sequential-loop bug from the audit
  return Promise.all(
    novel.map(async (file): Promise<FileAttachment> => {
      const isImage = file.type.startsWith("image/");
      const [data] = await Promise.all([fileToBase64(file)]);
      return {
        id: crypto.randomUUID(),
        type: isImage ? "image" : "document",
        mediaType: file.type,
        name: file.name,
        data,
        preview: isImage ? URL.createObjectURL(file) : undefined,
        size: file.size,
      };
    }),
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

interface UseFileAttachmentsOptions {
  /** MIME type accept list. Defaults to images + PDF + plain text. */
  accept?: string[];
  /** Ref of the drop-zone container — used to suppress drag-leave flicker on child elements. */
  containerRef?: React.RefObject<HTMLElement | null>;
}

export interface UseFileAttachmentsReturn {
  pendingAttachments: FileAttachment[];
  isDragging: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;

  /** Add files from any source. Returns attachments that were accepted. */
  addFiles: (files: FileList | File[]) => Promise<void>;
  /** Remove one attachment by id and revoke its preview URL. */
  removeAttachment: (id: string) => void;
  /** Clear all pending attachments (e.g. after send). */
  clearAttachments: () => void;
  /** Revoke preview URLs for a specific list of attachments (e.g. just-sent messages). */
  revokeAttachments: (attachments: FileAttachment[]) => void;

  /** Spread these onto the drop-zone element. */
  handlers: {
    onDragOver: React.DragEventHandler;
    onDragLeave: React.DragEventHandler;
    onDrop: React.DragEventHandler;
    onPaste: React.ClipboardEventHandler;
    onFileInputChange: React.ChangeEventHandler<HTMLInputElement>;
  };
}

const DEFAULT_ACCEPT = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "text/plain",
];

export function useFileAttachments(
  options: UseFileAttachmentsOptions = {},
): UseFileAttachmentsReturn {
  const { accept = DEFAULT_ACCEPT, containerRef } = options;

  const [pendingAttachments, setPendingAttachments] = useState<FileAttachment[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Track all object URLs created so we can revoke on unmount
  const createdUrls = useRef<Set<string>>(new Set());

  // Revoke all URLs on unmount
  useEffect(() => {
    const urls = createdUrls.current;
    return () => {
      for (const url of urls) {
        URL.revokeObjectURL(url);
      }
    };
  }, []);

  const addFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      if (fileArray.length === 0) return;

      const newAttachments = await processFileList(
        fileArray,
        accept,
        pendingAttachments,
      );

      // Track newly created preview URLs
      for (const a of newAttachments) {
        if (a.preview) createdUrls.current.add(a.preview);
      }

      if (newAttachments.length > 0) {
        setPendingAttachments((prev) => [...prev, ...newAttachments]);
      }
    },
    [accept, pendingAttachments],
  );

  const removeAttachment = useCallback((id: string) => {
    setPendingAttachments((prev) => {
      const removed = prev.find((a) => a.id === id);
      if (removed?.preview) {
        URL.revokeObjectURL(removed.preview);
        createdUrls.current.delete(removed.preview);
      }
      return prev.filter((a) => a.id !== id);
    });
  }, []);

  const clearAttachments = useCallback(() => {
    // Previews for sent attachments are revoked by revokeAttachments() before
    // this runs — so we just empty the state here.
    setPendingAttachments([]);
  }, []);

  const revokeAttachments = useCallback((attachments: FileAttachment[]) => {
    for (const a of attachments) {
      if (a.preview) {
        URL.revokeObjectURL(a.preview);
        createdUrls.current.delete(a.preview);
      }
    }
  }, []);

  const handlers: UseFileAttachmentsReturn["handlers"] = {
    onDragOver: useCallback((e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(true);
    }, []),

    onDragLeave: useCallback(
      (e: React.DragEvent) => {
        if (
          containerRef?.current &&
          containerRef.current.contains(e.relatedTarget as Node)
        ) {
          return; // still within the container — don't clear overlay
        }
        setIsDragging(false);
      },
      [containerRef],
    ),

    onDrop: useCallback(
      (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files.length > 0) {
          void addFiles(e.dataTransfer.files);
        }
      },
      [addFiles],
    ),

    onPaste: useCallback(
      (e: React.ClipboardEvent) => {
        const imageItems = Array.from(e.clipboardData.items).filter(
          (item) => item.kind === "file" && item.type.startsWith("image/"),
        );
        if (imageItems.length === 0) return;
        e.preventDefault();
        const files = imageItems
          .map((item) => item.getAsFile())
          .filter((f): f is File => f !== null);
        void addFiles(files);
      },
      [addFiles],
    ),

    onFileInputChange: useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) void addFiles(e.target.files);
        e.target.value = "";
      },
      [addFiles],
    ),
  };

  return {
    pendingAttachments,
    isDragging,
    fileInputRef,
    addFiles,
    removeAttachment,
    clearAttachments,
    revokeAttachments,
    handlers,
  };
}
