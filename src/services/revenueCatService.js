import { Capacitor } from '@capacitor/core';
import { Purchases, LOG_LEVEL } from '@revenuecat/purchases-capacitor';

const ENTITLEMENT_ID = 'anchored_pro';
const OFFERING_ID = 'default';
const ENV_MONTHLY_FALLBACK_ID = String(import.meta.env.VITE_RC_PRODUCT_MONTHLY || '').trim();
const ENV_YEARLY_FALLBACK_ID = String(import.meta.env.VITE_RC_PRODUCT_YEARLY || '').trim();

const OFFERING_RETRY_DELAYS_MS = [0, 1200, 2200];

let configured = false;

function isNative() {
  return Capacitor.isNativePlatform();
}

function getApiKey() {
  const platform = Capacitor.getPlatform();
  if (platform === 'ios') return import.meta.env.VITE_REVENUECAT_APPLE_API_KEY || '';
  if (platform === 'android') return import.meta.env.VITE_REVENUECAT_GOOGLE_API_KEY || '';
  return '';
}

export async function initRevenueCat(appUserId) {
  if (!isNative()) return false;
  const apiKey = getApiKey().trim();
  if (!apiKey) return false;

  if (!configured) {
    await Purchases.setLogLevel({ level: import.meta.env.DEV ? LOG_LEVEL.INFO : LOG_LEVEL.ERROR });
    await Purchases.configure({ apiKey, appUserID: appUserId || undefined });
    configured = true;
    return true;
  }

  if (appUserId) {
    await Purchases.logIn({ appUserID: appUserId });
  }
  return true;
}

export async function logoutRevenueCat() {
  if (!configured || !isNative()) return;
  try {
    await Purchases.logOut();
  } catch (_) {}
}

export async function hasPremiumEntitlement() {
  if (!configured || !isNative()) return false;
  const { customerInfo } = await Purchases.getCustomerInfo();
  return Boolean(customerInfo?.entitlements?.active?.[ENTITLEMENT_ID]);
}

export async function purchasePremium(preferredPackageId = '') {
  if (!configured || !isNative()) {
    throw new Error('RevenueCat is not configured on this device.');
  }

  const offeringsResult = await getOfferingsWithRetry();
  const packages = extractAvailablePackages(offeringsResult);
  const planKey = String(preferredPackageId || '').trim().toLowerCase();
  const pkg = pickPackageForPlan(packages, planKey);

  if (!pkg) {
    throw new Error(
      'No subscription package is available. In App Store Connect, submit subscriptions with an app build (Ready to Submit won’t load in StoreKit). On simulator, add a StoreKit Configuration file or test on a device with a sandbox Apple ID.',
    );
  }

  const { customerInfo } = await Purchases.purchasePackage({
    aPackage: pkg,
  });
  return Boolean(customerInfo?.entitlements?.active?.[ENTITLEMENT_ID]);
}

async function getOfferingsWithRetry() {
  let lastOfferings = null;
  for (const delay of OFFERING_RETRY_DELAYS_MS) {
    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
    const offerings = await Purchases.getOfferings();
    lastOfferings = offerings;
    if (extractAvailablePackages(offerings).length > 0) {
      return offerings;
    }
  }
  return lastOfferings;
}

function extractAvailablePackages(offeringsResult) {
  const current = offeringsResult?.current?.availablePackages || [];
  if (current.length > 0) return current;

  const fallbackOffering = offeringsResult?.all?.[OFFERING_ID]?.availablePackages || [];
  if (fallbackOffering.length > 0) return fallbackOffering;

  const allOfferings = offeringsResult?.all || {};
  return Object.values(allOfferings)
    .flatMap((offering) => offering?.availablePackages || [])
    .filter(Boolean);
}

function packageIncludesAnyTerm(item, terms) {
  const identifier = String(item?.identifier || '').toLowerCase();
  const productIdentifier = String(item?.storeProduct?.productIdentifier || '').toLowerCase();
  return terms.some((term) => identifier.includes(term) || productIdentifier.includes(term));
}

function normalizeId(value) {
  return String(value || '').trim().toLowerCase().replace(/^\$/, '');
}

function packageMatchesId(item, target) {
  const wanted = normalizeId(target);
  if (!wanted) return false;
  const identifier = normalizeId(item?.identifier);
  const productIdentifier = normalizeId(item?.storeProduct?.productIdentifier);
  return identifier === wanted || productIdentifier === wanted;
}

/**
 * Maps paywall plan keys (monthly | yearly) to RevenueCat packages from `getOfferings()`.
 * Prefers packageType + $rc identifiers and can use optional env fallback product IDs.
 */
export function pickPackageForPlan(packages, planKey, fallbackIds = {}) {
  const list = packages || [];
  if (list.length === 0) return null;

  const key = planKey === 'yearly' ? 'yearly' : 'monthly';

  // Most stable selection path: RevenueCat package type, independent of store product IDs.
  const desiredPackageType = key === 'yearly' ? 'annual' : 'monthly';
  const byType = list.find((item) => String(item?.packageType || '').toLowerCase() === desiredPackageType);
  if (byType) return byType;

  const exactPackageId = key === 'yearly' ? '$rc_annual' : '$rc_monthly';
  const exact = list.find((item) => String(item?.identifier || '').toLowerCase() === exactPackageId);
  if (exact) return exact;

  const envFallback =
    key === 'yearly'
      ? (fallbackIds.yearly ?? ENV_YEARLY_FALLBACK_ID)
      : (fallbackIds.monthly ?? ENV_MONTHLY_FALLBACK_ID);
  if (envFallback) {
    const envMatched = list.find((item) => packageMatchesId(item, envFallback));
    if (envMatched) return envMatched;
  }

  const fuzzyTerms = key === 'yearly'
    ? ['annual', 'yearly', 'year']
    : ['monthly', 'month'];
  const fuzzy = list.find((item) => packageIncludesAnyTerm(item, fuzzyTerms));
  if (fuzzy) return fuzzy;

  // Last resort: any package (better than failing if StoreKit shape changes)
  return list[0] || null;
}

export async function restorePremium() {
  if (!configured || !isNative()) {
    throw new Error('RevenueCat is not configured on this device.');
  }
  const { customerInfo } = await Purchases.restorePurchases();
  return Boolean(customerInfo?.entitlements?.active?.[ENTITLEMENT_ID]);
}

export async function refreshPremiumStatus() {
  if (!configured || !isNative()) return false;
  return hasPremiumEntitlement();
}

export function getSubscriptionManagementUrl() {
  const platform = Capacitor.getPlatform();
  if (platform === 'ios') return 'https://apps.apple.com/account/subscriptions';
  if (platform === 'android') return 'https://play.google.com/store/account/subscriptions';
  return 'https://apps.apple.com/account/subscriptions';
}
