export const APP_META = {
  supportEmail: 'bostoncelticsvincent@gmail.com',
  legal: {
    privacyUrl: (import.meta.env.VITE_PRIVACY_POLICY_URL || 'https://anchoredapp.net/privacy.html').trim(),
    // Apple accepts the standard EULA URL for subscription terms.
    termsUrl: (import.meta.env.VITE_TERMS_URL || 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/').trim(),
  },
};
