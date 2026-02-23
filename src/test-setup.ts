// Guard: only import DOM-related setup in jsdom environment
export {};
const hasDom = typeof window !== "undefined" && typeof document !== "undefined";

if (hasDom) {
  // Dynamic imports so they don't fail in node environment
  await import("@testing-library/jest-dom/vitest");
  const { cleanup } = await import("@testing-library/react");
  const { afterEach } = await import("vitest");

  // Ensure DOM cleanup between tests
  afterEach(() => {
    cleanup();
  });

  // Mock ResizeObserver (not available in jsdom)
  if (typeof globalThis.ResizeObserver === "undefined") {
    globalThis.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof globalThis.ResizeObserver;
  }

  // Mock Element.scrollIntoView (not available in jsdom)
  if (typeof Element.prototype.scrollIntoView === "undefined") {
    Element.prototype.scrollIntoView = () => {};
  }

  // Mock window.matchMedia for next-themes and components that use media queries
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}
