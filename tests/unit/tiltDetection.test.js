import { describe, it, expect } from 'vitest';
import {
  tiltCheckAnswerToTen,
  tiltCheckAnswerIsElevated,
  calculateAccumulatedTilt,
  runTiltCheck,
  getGameQuality,
  detectPassiveTilt,
  analyzePatterns,
} from '../../src/utils/tiltDetection.js';

describe('tiltCheckAnswerToTen', () => {
  it('maps 1–5 scale onto 1–10', () => {
    expect(tiltCheckAnswerToTen(1)).toBe(1);
    expect(tiltCheckAnswerToTen(5)).toBe(10);
    expect(tiltCheckAnswerToTen(3)).toBeCloseTo(5.5, 5);
  });

  it('passes through legacy 6–10 values', () => {
    expect(tiltCheckAnswerToTen(8)).toBe(8);
  });
});

describe('tiltCheckAnswerIsElevated', () => {
  it('is true at internal 6+', () => {
    expect(tiltCheckAnswerIsElevated(4)).toBe(true);
    expect(tiltCheckAnswerIsElevated(3)).toBe(false);
  });
});

describe('calculateAccumulatedTilt', () => {
  it('returns none when no completed sessions', () => {
    const r = calculateAccumulatedTilt([]);
    expect(r.level).toBe('none');
    expect(r.score).toBe(0);
  });

  it('weights recent tilt sessions', () => {
    const sessions = [
      {
        endTime: 1,
        buyInsLost: 0,
        checks: [{ result: { status: 'tilt' }, answers: { frustrationLevel: 1 } }],
      },
    ];
    const r = calculateAccumulatedTilt(sessions);
    expect(r.score).toBeGreaterThan(0);
    expect(['elevated', 'high', 'none']).toContain(r.level);
  });
});

describe('runTiltCheck', () => {
  const baseSession = {
    startTime: Date.now() - 30 * 60 * 1000,
    netBuyIns: 0,
    buyInsLost: 0,
    events: [],
    checks: [],
    preSessionState: null,
  };

  it('returns clear for calm answers and quiet session', () => {
    const result = runTiltCheck({
      rushingDecisions: 1,
      playingLooser: 1,
      frustrationLevel: 1,
      chasingLosses: 1,
      selfCriticism: 1,
      session: baseSession,
      accumulatedTilt: { level: 'none' },
      tiltProfile: null,
    });
    expect(result.status).toBe('clear');
    expect(result.score).toBeLessThan(35);
  });

  it('returns tilt for extreme frustration', () => {
    const result = runTiltCheck({
      rushingDecisions: 5,
      playingLooser: 5,
      frustrationLevel: 5,
      chasingLosses: 5,
      selfCriticism: 5,
      session: { ...baseSession, buyInsLost: 3, events: [{ type: 'bad_beat', timestamp: Date.now() }] },
      accumulatedTilt: { level: 'high' },
      tiltProfile: null,
    });
    expect(result.status).toBe('tilt');
    expect(result.score).toBeGreaterThanOrEqual(70);
  });

  it('includes gameQuality', () => {
    const r = runTiltCheck({
      rushingDecisions: 1,
      playingLooser: 1,
      frustrationLevel: 1,
      chasingLosses: 1,
      selfCriticism: 1,
      session: baseSession,
      accumulatedTilt: { level: 'none' },
      tiltProfile: null,
    });
    expect(r.gameQuality).toEqual(getGameQuality(r.score));
  });
});

describe('getGameQuality', () => {
  it('buckets score bands', () => {
    expect(getGameQuality(10).label).toBe('Stable');
    expect(getGameQuality(50).label).toBe('Warning Zone');
    expect(getGameQuality(90).label).toBe('Tilt Risk');
  });
});

describe('detectPassiveTilt', () => {
  it('detects heavy loss + bad stretch', () => {
    const now = Date.now();
    const session = {
      buyInsLost: 3,
      events: [
        { type: 'bad_beat', timestamp: now },
        { type: 'bad_beat', timestamp: now },
      ],
      preSessionState: { energy: 'low', stress: 'high' },
    };
    const d = detectPassiveTilt(session, null);
    expect(d?.detected).toBe(true);
  });

  it('returns null for quiet session', () => {
    expect(detectPassiveTilt({ buyInsLost: 0, events: [] }, null)).toBeNull();
  });
});

describe('analyzePatterns', () => {
  it('returns empty for few sessions', () => {
    expect(analyzePatterns([{}, {}])).toEqual([]);
  });

  it('finds bad-beat tilt pattern', () => {
    const mk = () => ({
      events: [{ type: 'bad_beat' }],
      checks: [{ result: { status: 'tilt' } }],
    });
    const p = analyzePatterns([mk(), mk(), mk()]);
    expect(p.some((x) => x.type === 'injustice')).toBe(true);
  });
});
