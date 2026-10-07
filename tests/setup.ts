import "@testing-library/jest-dom/vitest";
if (typeof window !== "undefined") {
  window.scrollTo = () => {}; (window as any).confirm = () => true; (window as any).prompt = () => "";
  if (!(globalThis as any).ResizeObserver) (globalThis as any).ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
}
