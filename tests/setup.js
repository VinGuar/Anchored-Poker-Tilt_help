import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { createMatchMediaMock, mockDesktopViewport } from './helpers/viewport.js';

mockDesktopViewport();

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = ResizeObserverMock;

afterEach(() => {
  sessionStorage.clear();
  localStorage.clear();
  window.matchMedia = createMatchMediaMock(false);
});
