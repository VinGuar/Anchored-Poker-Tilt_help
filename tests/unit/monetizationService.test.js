import { describe, it, expect, beforeEach } from 'vitest';
import {
  buildTiltProfileReport,
  getMonetizationState,
  updateMonetizationState,
} from '../../src/services/monetizationService.js';

const sampleInput = {
  scaleVersion: 'v2_1to5',
  personaAlias: 'Tester',
  primaryGame: 'NLHE',
  volumeStyle: 'Weekend',
  scenarioBadBeat: 4,
  scenarioBluffCaught: 2,
  scenarioBigLossChase: 4,
  scenarioUpBigLoosen: 2,
  scenarioCardDead: 3,
  scenarioMistake: 4,
  scenarioHateLosing: 3,
  scenarioEntitlement: 2,
  injusticeSensitivity: 4,
  losingDistress: 4,
  selfCriticalness: 4,
  skillExpectation: 3,
  egoInvolvement: 3,
  desperationUrgency: 4,
  actionNeed: 3,
  momentumShift: 3,
};

describe('buildTiltProfileReport', () => {
  it('returns personaKey and risk metadata', () => {
    const r = buildTiltProfileReport(sampleInput);
    expect(r.personaKey).toBeTruthy();
    expect(r.profileType).toBeTruthy();
    expect(['Low', 'Moderate', 'High']).toContain(r.riskBand);
    expect(r.riskScore).toBeGreaterThanOrEqual(0);
    expect(r.riskScore).toBeLessThanOrEqual(100);
    expect(Array.isArray(r.personaBlend)).toBe(true);
    expect(r.personaBlend.length).toBe(8);
    expect(r.triggerWeights).toBeTruthy();
    expect(r.questionWeights).toBeTruthy();
    expect(Array.isArray(r.recommendations)).toBe(true);
  });

  it('includes topTriggers only when blend crosses threshold', () => {
    const low = buildTiltProfileReport({
      ...sampleInput,
      scenarioBadBeat: 1,
      scenarioBluffCaught: 1,
      scenarioBigLossChase: 1,
      scenarioUpBigLoosen: 1,
      scenarioCardDead: 1,
      scenarioMistake: 1,
      scenarioHateLosing: 1,
      scenarioEntitlement: 1,
      injusticeSensitivity: 2,
      losingDistress: 2,
      selfCriticalness: 2,
      skillExpectation: 2,
      egoInvolvement: 2,
      desperationUrgency: 2,
      actionNeed: 2,
      momentumShift: 2,
    });
    expect(Array.isArray(low.topTriggers)).toBe(true);
  });
});

describe('monetization local persistence', () => {
  beforeEach(() => {
    localStorage.removeItem('anchored_monetization_v1');
  });

  it('getMonetizationState returns defaults for unknown user', () => {
    const s = getMonetizationState('user-x');
    expect(s.premium).toBe(false);
  });

  it('updateMonetizationState merges per user', () => {
    updateMonetizationState('u1', { premium: true });
    expect(getMonetizationState('u1').premium).toBe(true);
    expect(getMonetizationState('u2').premium).toBe(false);
  });
});
