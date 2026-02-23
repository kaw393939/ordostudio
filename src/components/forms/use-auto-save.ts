"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type StorageAdapter = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

const defaultStorage: StorageAdapter = {
  getItem: (key) => localStorage.getItem(key),
  setItem: (key, value) => localStorage.setItem(key, value),
  removeItem: (key) => localStorage.removeItem(key),
};

type AutoSaveOptions<T> = {
  key: string;
  data: T;
  intervalMs: number;
  isDirty: boolean;
  storage?: StorageAdapter;
};

type StoredDraft<T> = {
  data: T;
  savedAt: number;
};

/**
 * Auto-saves form data to storage at a regular interval.
 * Provides draft detection, restoration, and clearing.
 */
export function useAutoSave<T>({
  key,
  data,
  intervalMs,
  isDirty,
  storage = defaultStorage,
}: AutoSaveOptions<T>) {
  const [hasDraft, setHasDraft] = useState(() => {
    try {
      return storage.getItem(key) !== null;
    } catch {
      return false;
    }
  });

  const dataRef = useRef(data);
  useEffect(() => { dataRef.current = data; });

  const isDirtyRef = useRef(isDirty);
  useEffect(() => { isDirtyRef.current = isDirty; });

  const storageRef = useRef(storage);
  useEffect(() => { storageRef.current = storage; });

  // Auto-save on interval
  useEffect(() => {
    const id = setInterval(() => {
      if (!isDirtyRef.current) return;

      const draft: StoredDraft<T> = {
        data: dataRef.current,
        savedAt: Date.now(),
      };
      storageRef.current.setItem(key, JSON.stringify(draft));
      setHasDraft(true);
    }, intervalMs);

    return () => clearInterval(id);
  }, [key, intervalMs]);

  const restoreDraft = useCallback((): T | null => {
    try {
      const raw = storageRef.current.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as StoredDraft<T>;
      return parsed.data;
    } catch {
      return null;
    }
  }, [key]);

  const clearDraft = useCallback(() => {
    storageRef.current.removeItem(key);
    setHasDraft(false);
  }, [key]);

  return { hasDraft, restoreDraft, clearDraft } as const;
}
