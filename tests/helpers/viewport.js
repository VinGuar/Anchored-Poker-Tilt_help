import { vi } from 'vitest';

/**
 * Plain function (not vi.fn) so Vitest `clearMocks` cannot strip the implementation.
 */
export function createMatchMediaMock(matches) {
  return (query) => ({
    matches,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  });
}

/** `(max-width: 1023px)` matches — same breakpoint as App keyboard logic. */
export function mockMobileViewport() {
  window.matchMedia = createMatchMediaMock(true);
}

export function mockDesktopViewport() {
  window.matchMedia = createMatchMediaMock(false);
}
