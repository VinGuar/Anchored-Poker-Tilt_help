import { describe, it, expect, beforeEach } from 'vitest';
import { mockMobileViewport, mockDesktopViewport } from '../helpers/viewport.js';

describe('viewport mocks (mobile vs desktop)', () => {
  beforeEach(() => {
    mockDesktopViewport();
  });

  it('desktop: matchMedia reports no match for a mobile query', () => {
    const mq = window.matchMedia('(max-width: 1023px)');
    expect(mq.matches).toBe(false);
  });

  it('mobile: matchMedia reports match for the same query', () => {
    mockMobileViewport();
    const mq = window.matchMedia('(max-width: 1023px)');
    expect(mq.matches).toBe(true);
  });
});
