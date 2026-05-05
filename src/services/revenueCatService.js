import { Capacitor } from '@capacitor/core';
import { Purchases, LOG_LEVEL } from '@revenuecat/purchases-capacitor';

const ENTITLEMENT_ID = 'anchored_pro';
const OFFERING_ID = 'default';
const PACKAGE_IDS = ['monthly', 'yearly'];
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
  const wanted = String(preferredPackageId || '').trim().toLowerCase();
  const validWanted = PACKAGE_IDS.includes(wanted) ? wanted : '';
  const pkg = validWanted
    ? packages.find((item) => String(item?.identifier || '').toLowerCase() === validWanted
      || String(item?.storeProduct?.productIdentifier || '').toLowerCase() === validWanted)
    : packages[0];

  if (!pkg) {
    throw new Error('No subscription package is available. Check RevenueCat offering setup and App Store Connect product IDs.');
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
