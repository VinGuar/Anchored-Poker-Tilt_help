import { describe, it, expect, vi, beforeAll } from 'vitest';

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: vi.fn(() => false),
    getPlatform: vi.fn(() => 'web'),
  },
}));

vi.mock('@revenuecat/purchases-capacitor', () => ({
  Purchases: {},
  LOG_LEVEL: { INFO: 0, ERROR: 1 },
}));

describe('revenueCatService (web / non-native)', () => {
  let initRevenueCat;
  let getSubscriptionManagementUrl;
  let purchasePremium;

  beforeAll(async () => {
    const m = await import('../../src/services/revenueCatService.js');
    initRevenueCat = m.initRevenueCat;
    getSubscriptionManagementUrl = m.getSubscriptionManagementUrl;
    purchasePremium = m.purchasePremium;
  });

  it('initRevenueCat resolves false when not native', async () => {
    expect(await initRevenueCat('user-1')).toBe(false);
  });

  it('getSubscriptionManagementUrl returns a URL string', () => {
    expect(getSubscriptionManagementUrl()).toMatch(/^https:\/\//);
  });

  it('purchasePremium rejects when not configured', async () => {
    await expect(purchasePremium('monthly')).rejects.toThrow(/not configured/i);
  });
});
