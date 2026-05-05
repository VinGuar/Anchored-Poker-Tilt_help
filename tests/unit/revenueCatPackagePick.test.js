import { describe, it, expect } from 'vitest';
import { pickPackageForPlan } from '../../src/services/revenueCatService.js';

describe('pickPackageForPlan', () => {
  const monthlySub = {
    identifier: '$rc_monthly',
    storeProduct: { productIdentifier: 'monthly_sub' },
  };
  const yearlySub = {
    identifier: '$rc_annual',
    storeProduct: { productIdentifier: 'yearly_sub' },
  };

  it('matches monthly_sub by store product id', () => {
    expect(pickPackageForPlan([monthlySub, yearlySub], 'monthly')).toBe(monthlySub);
  });

  it('matches yearly_sub by store product id', () => {
    expect(pickPackageForPlan([monthlySub, yearlySub], 'yearly')).toBe(yearlySub);
  });

  it('matches legacy monthly / yearly ids', () => {
    const legacyM = { identifier: '$rc_monthly', storeProduct: { productIdentifier: 'monthly' } };
    const legacyY = { identifier: '$rc_annual', storeProduct: { productIdentifier: 'yearly' } };
    expect(pickPackageForPlan([legacyM, legacyY], 'monthly')).toBe(legacyM);
    expect(pickPackageForPlan([legacyM, legacyY], 'yearly')).toBe(legacyY);
  });

  it('returns null when packages empty', () => {
    expect(pickPackageForPlan([], 'monthly')).toBeNull();
  });
});
