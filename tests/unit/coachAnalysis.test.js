import { describe, it, expect } from 'vitest';
import { generateCoachAnalysis } from '../../src/utils/coachAnalysis.js';

describe('generateCoachAnalysis', () => {
  const tiltProfile = { personaKey: 'desperation' };

  it('prompts check-ins when none recorded', () => {
    const session = {
      id: 's1',
      checks: [],
      events: [{ type: 'bad_beat', timestamp: Date.now() }],
      preSessionState: { energy: 'ok', stress: 'low' },
    };
    const lines = generateCoachAnalysis(session, tiltProfile, []);
    expect(lines.length).toBeGreaterThan(0);
    expect(lines.join(' ')).toMatch(/check-in/i);
  });

  it('returns up to three strings for session with checks', () => {
    const session = {
      id: 's1',
      checks: [
        {
          timestamp: 1,
          answers: { frustrationLevel: 3, chasingLosses: 3, rushingDecisions: 3, playingLooser: 3, selfCriticism: 3 },
          result: { score: 40, status: 'warning' },
        },
      ],
      events: [],
      preSessionState: { energy: 'good', stress: 'low' },
    };
    const lines = generateCoachAnalysis(session, tiltProfile, []);
    expect(Array.isArray(lines)).toBe(true);
    expect(lines.length).toBeLessThanOrEqual(3);
    expect(lines.every((l) => typeof l === 'string')).toBe(true);
  });
});
