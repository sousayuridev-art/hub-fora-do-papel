import "@testing-library/jest-dom/vitest";

Object.defineProperty(window, "scrollTo", {
  writable: true,
  value: () => {},
});

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
    dispatchEvent: () => {},
  }),
});

// O editor de páginas (Puck/dnd-kit) usa ResizeObserver ao carregar; o jsdom não tem.
class ResizeObserverFalso {
  observe() {}
  unobserve() {}
  disconnect() {}
}
if (!("ResizeObserver" in window))
  Object.defineProperty(window, "ResizeObserver", { writable: true, value: ResizeObserverFalso });
if (!("ResizeObserver" in globalThis))
  Object.defineProperty(globalThis, "ResizeObserver", {
    writable: true,
    value: ResizeObserverFalso,
  });
