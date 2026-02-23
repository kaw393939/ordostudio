"use client";

import { useEffect, useCallback } from "react";

/**
 * Registers a `beforeunload` listener when the form is dirty,
 * preventing accidental browser navigation away from unsaved work.
 */
export function useUnsavedChangesGuard(isDirty: boolean) {
  const handler = useCallback((e: BeforeUnloadEvent) => {
    e.preventDefault();
  }, []);

  useEffect(() => {
    if (isDirty) {
      window.addEventListener("beforeunload", handler);
    }

    return () => {
      window.removeEventListener("beforeunload", handler);
    };
  }, [isDirty, handler]);
}
