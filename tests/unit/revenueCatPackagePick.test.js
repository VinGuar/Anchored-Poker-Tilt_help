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

  it('prefers RevenueCat monthly package identifier', () => {
    expect(pickPackageForPlan([monthlySub, yearlySub], 'monthly')).toBe(monthlySub);
  });

  it('prefers RevenueCat annual package identifier', () => {
    expect(pickPackageForPlan([monthlySub, yearlySub], 'yearly')).toBe(yearlySub);
  });

  it('falls back to fuzzy matching on package/product identifiers', () => {
    const fuzzyMonth = { identifier: '$custom_month', storeProduct: { productIdentifier: 'pro_monthly' } };
    const fuzzyYear = { identifier: '$custom_year', storeProduct: { productIdentifier: 'pro_annual' } };
    expect(pickPackageForPlan([fuzzyMonth, fuzzyYear], 'monthly')).toBe(fuzzyMonth);
    expect(pickPackageForPlan([fuzzyMonth, fuzzyYear], 'yearly')).toBe(fuzzyYear);
  });

  it('prefers packageType so renamed/recreated products still map correctly', () => {
    const rebuiltMonth = {
      identifier: '$custom_plan_1',
      packageType: 'MONTHLY',
      storeProduct: { productIdentifier: 'com.anchored.sub.v2.month' },
    };
    const rebuiltYear = {
      identifier: '$custom_plan_2',
      packageType: 'ANNUAL',
      storeProduct: { productIdentifier: 'com.anchored.sub.v2.year' },
    };
    expect(pickPackageForPlan([rebuiltMonth, rebuiltYear], 'monthly')).toBe(rebuiltMonth);
    expect(pickPackageForPlan([rebuiltMonth, rebuiltYear], 'yearly')).toBe(rebuiltYear);
  });

  it('supports explicit env-style fallback IDs when standard package keys are missing', () => {
    const customMonth = {
      identifier: '$custom',
      storeProduct: { productIdentifier: 'zz_monthly_fallback' },
    };
    const customYear = {
      identifier: '$custom2',
      storeProduct: { productIdentifier: 'zz_yearly_fallback' },
    };

    expect(
      pickPackageForPlan([customMonth, customYear], 'monthly', { monthly: 'zz_monthly_fallback' }),
    ).toBe(customMonth);
    expect(
      pickPackageForPlan([customMonth, customYear], 'yearly', { yearly: 'zz_yearly_fallback' }),
    ).toBe(customYear);
  });

  it('returns null when packages empty', () => {
    expect(pickPackageForPlan([], 'monthly')).toBeNull();
  });
});
