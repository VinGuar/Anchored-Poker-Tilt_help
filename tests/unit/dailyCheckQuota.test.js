import { describe, it, expect } from 'vitest';
import {
  getLocalDayBounds,
  hasUsedFreeCheckToday,
  mergeActiveIntoSessionsList,
} from '../../src/utils/dailyCheckQuota.js';

describe('getLocalDayBounds', () => {
  it('returns start before end', () => {
    const ref = new Date('2026-05-05T12:00:00').getTime();
    const { todayStart, tomorrowStart } = getLocalDayBounds(ref);
    expect(todayStart).toBeLessThan(tomorrowStart);
    expect(ref).toBeGreaterThanOrEqual(todayStart);
    expect(ref).toBeLessThan(tomorrowStart);
  });
});

describe('hasUsedFreeCheckToday', () => {
  it('is false when no checks today', () => {
    const ref = new Date('2026-05-05T15:00:00').getTime();
    const { todayStart } = getLocalDayBounds(ref);
    const sessions = [{ checks: [{ timestamp: todayStart - 60_000 }] }];
    expect(hasUsedFreeCheckToday(sessions, ref)).toBe(false);
  });

  it('is true when a check timestamp falls in today', () => {
    const ref = new Date('2026-05-05T15:00:00').getTime();
    const { todayStart, tomorrowStart } = getLocalDayBounds(ref);
    const mid = todayStart + (tomorrowStart - todayStart) / 2;
    expect(hasUsedFreeCheckToday([{ checks: [{ timestamp: mid }] }], ref)).toBe(true);
  });

  it('ignores invalid timestamps', () => {
    expect(hasUsedFreeCheckToday([{ checks: [{ timestamp: NaN }] }])).toBe(false);
  });
});

describe('mergeActiveIntoSessionsList', () => {
  it('prepends active session when missing from list', () => {
    const active = { id: 'a', checks: [] };
    expect(mergeActiveIntoSessionsList([], active)).toEqual([active]);
  });

  it('replaces matching row with live active session', () => {
    const active = { id: '1', checks: [{ timestamp: 1 }] };
    const list = [{ id: '1', checks: [] }];
    const merged = mergeActiveIntoSessionsList(list, active);
    expect(merged).toHaveLength(1);
    expect(merged[0].checks).toEqual(active.checks);
  });
});
