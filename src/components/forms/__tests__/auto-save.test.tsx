/**
 * Sprint 46 — TDD Step 7: Auto-save drafts.
 *
 * - Auto-save to localStorage every N seconds
 * - "Draft saved" indicator
 * - Restore draft on return
 */
import { act } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useAutoSave, type StorageAdapter } from "@/components/forms/use-auto-save";

function createMockStorage(): StorageAdapter & { _store: Record<string, string> } {
  const store: Record<string, string> = {};
  return {
    _store: store,
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
  };
}

let mockStorage: ReturnType<typeof createMockStorage>;

describe("useAutoSave hook", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockStorage = createMockStorage();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("saves data to localStorage after interval", () => {
    const data = { name: "Alice", email: "alice@test.com" };

    renderHook(() =>
      useAutoSave({
        key: "test-draft",
        data,
        intervalMs: 10000,
        isDirty: true,
        storage: mockStorage,
      })
    );

    act(() => vi.advanceTimersByTime(10001));

    expect(mockStorage._store["test-draft"]).toBeDefined();
    const saved = JSON.parse(mockStorage._store["test-draft"]);
    expect(saved.data).toEqual(data);
  });

  it("does not save when form is not dirty", () => {
    renderHook(() =>
      useAutoSave({
        key: "test-draft",
        data: { name: "Alice" },
        intervalMs: 10000,
        isDirty: false,
        storage: mockStorage,
      })
    );

    act(() => vi.advanceTimersByTime(10001));

    expect(mockStorage._store["test-draft"]).toBeUndefined();
  });

  it("returns hasDraft=true when a draft exists", () => {
    mockStorage._store["test-draft"] = JSON.stringify({
      data: { name: "Bob" },
      savedAt: Date.now(),
    });

    const { result } = renderHook(() =>
      useAutoSave({
        key: "test-draft",
        data: { name: "" },
        intervalMs: 10000,
        isDirty: false,
        storage: mockStorage,
      })
    );

    expect(result.current.hasDraft).toBe(true);
  });

  it("returns hasDraft=false when no draft exists", () => {
    const { result } = renderHook(() =>
      useAutoSave({
        key: "test-draft",
        data: { name: "" },
        intervalMs: 10000,
        isDirty: false,
        storage: mockStorage,
      })
    );

    expect(result.current.hasDraft).toBe(false);
  });

  it("restoreDraft returns the saved data", () => {
    const saved = { name: "Bob", email: "bob@test.com" };
    mockStorage._store["test-draft"] = JSON.stringify({
      data: saved,
      savedAt: Date.now(),
    });

    const { result } = renderHook(() =>
      useAutoSave({
        key: "test-draft",
        data: { name: "", email: "" },
        intervalMs: 10000,
        isDirty: false,
        storage: mockStorage,
      })
    );

    expect(result.current.restoreDraft()).toEqual(saved);
  });

  it("clearDraft removes the draft from storage", () => {
    mockStorage._store["test-draft"] = JSON.stringify({
      data: { name: "Bob" },
      savedAt: Date.now(),
    });

    const { result } = renderHook(() =>
      useAutoSave({
        key: "test-draft",
        data: { name: "" },
        intervalMs: 10000,
        isDirty: false,
        storage: mockStorage,
      })
    );

    act(() => result.current.clearDraft());

    expect(mockStorage._store["test-draft"]).toBeUndefined();
    expect(result.current.hasDraft).toBe(false);
  });

  it("includes savedAt timestamp in stored data", () => {
    const now = 1700000000000;
    vi.setSystemTime(now);

    renderHook(() =>
      useAutoSave({
        key: "test-draft",
        data: { name: "Test" },
        intervalMs: 10000,
        isDirty: true,
        storage: mockStorage,
      })
    );

    act(() => vi.advanceTimersByTime(10001));

    expect(mockStorage._store["test-draft"]).toBeDefined();
    const saved = JSON.parse(mockStorage._store["test-draft"]);
    // Date.now() advances with fake timers, so savedAt ≈ now + intervalMs
    expect(saved.savedAt).toBeGreaterThanOrEqual(now);
    expect(typeof saved.savedAt).toBe("number");
  });
});
